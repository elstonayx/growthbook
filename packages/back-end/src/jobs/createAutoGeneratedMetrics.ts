/* eslint-disable no-console */
import Agenda, { Job } from "agenda";
import uniqid from "uniqid";
import { getDataSourceById } from "../models/DataSourceModel";
import { insertMetrics } from "../models/MetricModel";
import { MetricInterface, MetricType } from "../../types/metric";
import { getSourceIntegrationObject } from "../services/datasource";
import { logger } from "../util/logger";
import { insertAudit } from "../util/legacyAudit/wrappers";
import { auditDetailsCreate } from "../services/audit";
import { ExpandedMember } from "../../types/organization";
import { AuditUserLoggedIn } from "../../types/audit";
import { getContextForAgendaJobByOrgId } from "../services/organizations";
import { trackJob } from "../services/otel";

const CREATE_AUTOGENERATED_METRICS_JOB_NAME = "createAutoGeneratedMetrics";

type CreateAutoGeneratedMetricsJob = Job<{
  organizationId: string;
  datasourceId: string;
  metricsToCreate: Pick<
    MetricInterface,
    | "name"
    | "type"
    | "sql"
    | "id"
    | "organization"
    | "datasource"
    | "dateCreated"
    | "dateUpdated"
  >[];
  user: Omit<
    ExpandedMember,
    "role" | "verified" | "limitAccessByEnvironment" | "environments"
  >;
}>;

const createAutoGeneratedMetrics = trackJob(
  CREATE_AUTOGENERATED_METRICS_JOB_NAME,
  async (job: CreateAutoGeneratedMetricsJob) => {
    const {
      datasourceId,
      organizationId,
      metricsToCreate,
      user,
    } = job.attrs.data;

    const context = await getContextForAgendaJobByOrgId(organizationId);

    try {
      const datasource = await getDataSourceById(context, datasourceId);

      if (!datasource) throw new Error("No datasource");

      const schemaFormat = datasource.settings.schemaFormat || "custom";

      if (schemaFormat === "custom")
        throw new Error(
          `Unable to automatically generate metrics for a custom schema format.`
        );

      const integration = getSourceIntegrationObject(context, datasource);

      if (!integration.getSourceProperties().supportsAutoGeneratedMetrics)
        throw new Error(
          "Auto generated metrics not supported for this data source"
        );

      const metrics: Pick<
        MetricInterface,
        | "name"
        | "type"
        | "sql"
        | "id"
        | "organization"
        | "datasource"
        | "dateCreated"
        | "dateUpdated"
      >[] = [];

      metricsToCreate.forEach((metric) => {
        metric.id = uniqid("met_");
        metric.organization = organizationId;
        metric.datasource = datasourceId;
        metric.dateCreated = new Date();
        metric.dateUpdated = new Date();
        metrics.push(metric);
      });

      await insertMetrics(metrics);

      for (const metric of metrics) {
        await insertAudit({
          event: "metric.autocreate",
          entity: {
            object: "metric",
            id: metric.id,
          },
          organization: organizationId,
          dateCreated: metric.dateCreated ? metric.dateCreated : new Date(),
          details: auditDetailsCreate(metric),
          user,
        });
      }
    } catch (e) {
      logger.error(
        e,
        "Failed to generate automatic metrics. Reason: " + e.message
      );
    }
  }
);

let agenda: Agenda;
export default function (ag: Agenda) {
  agenda = ag;
  agenda.define(
    CREATE_AUTOGENERATED_METRICS_JOB_NAME,
    createAutoGeneratedMetrics
  );
}

export async function queueCreateAutoGeneratedMetrics(
  datasourceId: string,
  organizationId: string,
  metricsToCreate: { name: string; type: MetricType; sql: string }[],
  user: AuditUserLoggedIn
) {
  if (!datasourceId || !organizationId || !metricsToCreate || !user) return;

  const job = agenda.create(CREATE_AUTOGENERATED_METRICS_JOB_NAME, {
    organizationId,
    datasourceId,
    metricsToCreate,
    user,
  }) as CreateAutoGeneratedMetricsJob;
  job.unique({ datasourceId, organizationId, metricsToCreate });
  job.schedule(new Date());
  await job.save();
}
