import { useRouter } from "next/router";
import { ExperimentReportArgs, ReportInterface } from "back-end/types/report";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { getValidDate, ago, datetime, date } from "shared/dates";
import { DEFAULT_STATS_ENGINE } from "shared/constants";
import { ExperimentInterfaceStringDates } from "back-end/types/experiment";
import { IdeaInterface } from "back-end/types/idea";
import { VisualChangesetInterface } from "back-end/types/visual-changeset";
import LoadingOverlay from "@front-end/components/LoadingOverlay";
import Markdown from "@front-end/components/Markdown/Markdown";
import useApi from "@front-end/hooks/useApi";
import { useDefinitions } from "@front-end/services/DefinitionsContext";
import RunQueriesButton, {
  getQueryStatus,
} from "@front-end/components/Queries/RunQueriesButton";
import DateResults from "@front-end/components/Experiment/DateResults";
import { useAuth } from "@front-end/services/auth";
import ControlledTabs from "@front-end/components/Tabs/ControlledTabs";
import Tab from "@front-end/components/Tabs/Tab";
import {
  GBCircleArrowLeft,
  GBCuped,
  GBEdit,
  GBSequential,
} from "@front-end/components/Icons";
import ConfigureReport from "@front-end/components/Report/ConfigureReport";
import ResultMoreMenu from "@front-end/components/Experiment/ResultMoreMenu";
import Toggle from "@front-end/components/Forms/Toggle";
import Field from "@front-end/components/Forms/Field";
import MarkdownInput from "@front-end/components/Markdown/MarkdownInput";
import Modal from "@front-end/components/Modal";
import Tooltip from "@front-end/components/Tooltip/Tooltip";
import { useUser } from "@front-end/services/UserContext";
import VariationIdWarning from "@front-end/components/Experiment/VariationIdWarning";
import DeleteButton from "@front-end/components/DeleteButton/DeleteButton";
import useOrgSettings from "@front-end/hooks/useOrgSettings";
import { trackReport } from "@front-end/services/track";
import CompactResults from "@front-end/components/Experiment/CompactResults";
import BreakDownResults from "@front-end/components/Experiment/BreakDownResults";
import DimensionChooser from "@front-end/components/Dimensions/DimensionChooser";

export default function ReportPage() {
  const router = useRouter();
  const { rid } = router.query;

  const [editModalOpen, setEditModalOpen] = useState(false);

  const { getDatasourceById } = useDefinitions();
  const { data, error, mutate } = useApi<{ report: ReportInterface }>(
    `/report/${rid}`
  );
  const { data: experimentData } = useApi<{
    experiment: ExperimentInterfaceStringDates;
    idea?: IdeaInterface;
    visualChangesets: VisualChangesetInterface[];
  }>(
    data?.report?.experimentId
      ? `/experiment/${data.report.experimentId}`
      : null
  );

  const {
    permissions,
    userId,
    getUserDisplay,
    hasCommercialFeature,
  } = useUser();
  const [active, setActive] = useState<string | null>("Results");
  const [refreshError, setRefreshError] = useState("");

  const { apiCall } = useAuth();

  // todo: move to report args
  const orgSettings = useOrgSettings();
  const pValueCorrection = orgSettings?.pValueCorrection;

  const hasRegressionAdjustmentFeature = hasCommercialFeature(
    "regression-adjustment"
  );
  const hasSequentialTestingFeature = hasCommercialFeature(
    "sequential-testing"
  );

  const form = useForm({
    defaultValues: {
      title: data?.report.title || "",
      description: data?.report.description || "",
      status: data?.report?.status ? data.report.status : "private",
    },
  });

  useEffect(() => {
    if (data?.report) {
      const newVal = {
        ...form.getValues(),
        title: data?.report.title,
        description: data?.report.description,
        status: data?.report?.status ? data.report.status : "private",
      };
      form.reset(newVal);
    }
  }, [data?.report]);

  if (error) {
    return <div className="alert alert-danger">{error.message}</div>;
  }
  if (!data) {
    return <LoadingOverlay />;
  }

  const report = data.report;
  if (!report) {
    return null;
  }

  const variations = report.args.variations;

  const datasource = getDatasourceById(report.args.datasource);

  const queryStatusData = getQueryStatus(report.queries || [], report.error);

  // @ts-expect-error TS(2532) If you come across this, please fix it!: Object is possibly 'undefined'.
  const hasData = report.results?.dimensions?.[0]?.variations?.length > 0;

  const phaseAgeMinutes =
    (Date.now() - getValidDate(report.args.startDate).getTime()) / (1000 * 60);

  const statsEngine = data?.report?.args?.statsEngine || DEFAULT_STATS_ENGINE;
  const regressionAdjustmentAvailable =
    hasRegressionAdjustmentFeature && statsEngine === "frequentist";
  const regressionAdjustmentEnabled =
    hasRegressionAdjustmentFeature &&
    regressionAdjustmentAvailable &&
    !!report.args.regressionAdjustmentEnabled;

  const sequentialTestingEnabled =
    hasSequentialTestingFeature && !!report.args.sequentialTestingEnabled;

  return (
    <div className="container-fluid pagecontents experiment-details">
      {editModalOpen && (
        <Modal
          open={true}
          submit={form.handleSubmit(async (value) => {
            await apiCall(`/report/${report.id}`, {
              method: "PUT",
              body: JSON.stringify(value),
            });
            mutate();
          })}
          close={() => {
            setEditModalOpen(false);
          }}
          header="Edit Report"
          overflowAuto={false}
        >
          <Field label="Title" {...form.register("title")} />
          <div className="form-group">
            <label>Description</label>
            <MarkdownInput
              setValue={(value) => {
                form.setValue("description", value);
              }}
              value={form.watch("description")}
            />
          </div>
          Publish:{" "}
          <Toggle
            id="toggle-status"
            value={form.watch("status") === "published"}
            label="published"
            setValue={(value) => {
              const newStatus = value ? "published" : "private";
              form.setValue("status", newStatus);
            }}
          />
          <Tooltip
            body={
              "A published report will be visible to other users of your team"
            }
          />
        </Modal>
      )}
      <div className="mb-3">
        {report?.experimentId && (
          <Link href={`/experiment/${report.experimentId}#results`}>
            <GBCircleArrowLeft className="mr-2" />
            Go to experiment results
          </Link>
        )}
        {permissions.check("createAnalyses", "") &&
          (userId === report?.userId || !report?.userId) && (
            <DeleteButton
              displayName="Custom Report"
              link={false}
              className="float-right btn-sm"
              text="delete"
              useIcon={true}
              onClick={async () => {
                await apiCall<{ status: number; message?: string }>(
                  `/report/${report.id}`,
                  {
                    method: "DELETE",
                  }
                );
                trackReport(
                  "delete",
                  "DeleteButton",
                  datasource?.type || null,
                  report
                );
                router.push(`/experiment/${report.experimentId}#results`);
              }}
            />
          )}
        <h1 className="mb-0 mt-2">
          {report.title}{" "}
          {permissions.check("createAnalyses", "") &&
            (userId === report?.userId || !report?.userId) && (
              <a
                className="ml-2 cursor-pointer"
                onClick={() => setEditModalOpen(true)}
              >
                <GBEdit />
              </a>
            )}
        </h1>
        <div className="mb-1">
          <small className="text-muted">
            Created {report?.userId && <>by {getUserDisplay(report.userId)} </>}{" "}
            on {date(report.dateCreated)} -{" "}
            <span className="badge badge-secondary">
              {form.watch("status") === "published" ? "Published" : "Private"}
            </span>
          </small>
        </div>
        {report.description && (
          <div className="mb-3">
            <Markdown>{report.description}</Markdown>
          </div>
        )}
      </div>

      <ControlledTabs
        active={active}
        setActive={setActive}
        newStyle={true}
        navClassName={permissions.check("createAnalyses", "") ? "" : "d-none"}
      >
        <Tab key="results" anchor="results" display="Results" padding={false}>
          <div className="pt-3 px-3">
            <div className="row align-items-center mb-2">
              <div className="col">
                <h2>Results</h2>
              </div>
              <div className="flex-1"></div>
              <div className="col-auto d-flex align-items-end mr-3">
                <DimensionChooser
                  value={report.args.dimension ?? ""}
                  activationMetric={!!report.args.activationMetric}
                  datasourceId={report.args.datasource}
                  exposureQueryId={report.args.exposureQueryId}
                  userIdType={report.args.userIdType}
                  labelClassName="mr-2"
                  disabled={true}
                />
              </div>
              <div className="col-auto">
                {hasData &&
                report.runStarted &&
                queryStatusData.status !== "running" ? (
                  <div
                    className="text-muted text-right"
                    style={{ width: 100, fontSize: "0.8em" }}
                    title={datetime(report.runStarted)}
                  >
                    <div
                      className="font-weight-bold"
                      style={{ lineHeight: 1.2 }}
                    >
                      updated
                    </div>
                    <div className="d-inline-block" style={{ lineHeight: 1 }}>
                      {ago(report.runStarted)}
                    </div>
                  </div>
                ) : (
                  ""
                )}
              </div>
              <div className="col-auto">
                {permissions.check(
                  "runQueries",
                  experimentData?.experiment.project || ""
                ) && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        const res = await apiCall<{
                          report: ReportInterface;
                        }>(`/report/${report.id}/refresh`, {
                          method: "POST",
                        });
                        trackReport(
                          "update",
                          "RefreshData",
                          datasource?.type || null,
                          res.report
                        );
                        mutate();
                        setRefreshError("");
                      } catch (e) {
                        setRefreshError(e.message);
                      }
                    }}
                  >
                    <RunQueriesButton
                      icon="refresh"
                      cta="Refresh Data"
                      mutate={mutate}
                      model={report}
                      cancelEndpoint={`/report/${report.id}/cancel`}
                      color="outline-primary"
                    />
                  </form>
                )}
              </div>
              <div className="col-auto">
                <ResultMoreMenu
                  id={report.id}
                  hasData={hasData}
                  forceRefresh={async () => {
                    try {
                      const res = await apiCall<{ report: ReportInterface }>(
                        `/report/${report.id}/refresh?force=true`,
                        {
                          method: "POST",
                        }
                      );
                      trackReport(
                        "update",
                        "ForceRefreshData",
                        datasource?.type || null,
                        res.report
                      );
                      mutate();
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  supportsNotebooks={!!datasource?.settings?.notebookRunQuery}
                  // @ts-expect-error TS(2322) If you come across this, please fix it!: Type '(() => void) | null' is not assignable to ty... Remove this comment to see the full error message
                  editMetrics={
                    permissions.check("createAnalyses", "")
                      ? () => setActive("Configuration")
                      : null
                  }
                  generateReport={false}
                  notebookUrl={`/report/${report.id}/notebook`}
                  notebookFilename={report.title}
                  queries={report.queries}
                  queryError={report.error}
                  // @ts-expect-error TS(2532) If you come across this, please fix it!: Object is possibly 'undefined'.
                  results={report.results.dimensions}
                  variations={variations}
                  metrics={report.args.metrics}
                  trackingKey={report.title}
                />
              </div>
            </div>
            {report.error ? (
              <div className="alert alert-danger">
                <strong>Error generating the report: </strong> {report.error}
              </div>
            ) : null}
            {refreshError && (
              <div className="alert alert-danger">
                <strong>Error refreshing data: </strong> {refreshError}
              </div>
            )}
            {report.args.metrics.length === 0 && (
              <div className="alert alert-info">
                Add at least 1 metric to view results.
              </div>
            )}
            {!hasData &&
              // @ts-expect-error TS(2532) If you come across this, please fix it!: Object is possibly 'undefined'.
              !report.results.unknownVariations?.length &&
              queryStatusData.status !== "running" &&
              report.args.metrics.length > 0 && (
                <div className="alert alert-info">
                  No data yet.{" "}
                  {report.results &&
                    phaseAgeMinutes >= 120 &&
                    "Make sure your experiment is tracking properly."}
                  {report.results &&
                    phaseAgeMinutes < 120 &&
                    "It was just started " +
                      ago(report.args.startDate) +
                      ". Give it a little longer and click the 'Refresh' button to check again."}
                  {!report.results &&
                    permissions.check(
                      "runQueries",
                      experimentData?.experiment.project || ""
                    ) &&
                    `Click the "Refresh" button.`}
                </div>
              )}
          </div>
          {hasData &&
            report.args.dimension &&
            (report.args.dimension.substring(0, 8) === "pre:date" ? (
              <DateResults
                metrics={report.args.metrics}
                guardrails={report.args.guardrails}
                // @ts-expect-error TS(2532) If you come across this, please fix it!: Object is possibly 'undefined'.
                results={report.results.dimensions}
                seriestype={report.args.dimension}
                variations={variations}
                statsEngine={report.args.statsEngine}
              />
            ) : (
              <BreakDownResults
                isLatestPhase={true}
                metrics={report.args.metrics}
                // @ts-expect-error TS(2322) If you come across this, please fix it!: Type 'MetricOverride[] | undefined' is not assigna... Remove this comment to see the full error message
                metricOverrides={report.args.metricOverrides}
                reportDate={report.dateCreated}
                results={report.results?.dimensions || []}
                status={"stopped"}
                startDate={getValidDate(report.args.startDate).toISOString()}
                dimensionId={report.args.dimension}
                activationMetric={report.args.activationMetric}
                guardrails={report.args.guardrails}
                variations={variations}
                key={report.args.dimension}
                statsEngine={report.args.statsEngine || DEFAULT_STATS_ENGINE}
                pValueCorrection={pValueCorrection}
                regressionAdjustmentEnabled={regressionAdjustmentEnabled}
                metricRegressionAdjustmentStatuses={
                  report.args.metricRegressionAdjustmentStatuses
                }
                sequentialTestingEnabled={sequentialTestingEnabled}
                differenceType={"relative"}
              />
            ))}
          {report.results && !report.args.dimension && (
            <VariationIdWarning
              unknownVariations={report.results?.unknownVariations || []}
              isUpdating={status === "running"}
              setVariationIds={async (ids) => {
                const args: ExperimentReportArgs = {
                  ...report.args,
                  variations: report.args.variations.map((v, i) => {
                    return {
                      ...v,
                      id: ids[i] ?? v.id,
                    };
                  }),
                };

                const res = await apiCall<{ updatedReport: ReportInterface }>(
                  `/report/${report.id}`,
                  {
                    method: "PUT",
                    body: JSON.stringify({
                      args,
                    }),
                  }
                );
                trackReport(
                  "update",
                  "VariationIdWarning",
                  datasource?.type || null,
                  res.updatedReport
                );
                mutate();
              }}
              variations={variations}
              results={report.results?.dimensions?.[0]}
            />
          )}
          {hasData &&
            !report.args.dimension &&
            report.results?.dimensions?.[0] !== undefined && (
              <div className="mt-0 mb-3">
                <CompactResults
                  variations={variations}
                  multipleExposures={report.results?.multipleExposures || 0}
                  results={report.results?.dimensions?.[0]}
                  queryStatusData={queryStatusData}
                  reportDate={report.dateCreated}
                  startDate={getValidDate(report.args.startDate).toISOString()}
                  isLatestPhase={true}
                  status={"stopped"}
                  metrics={report.args.metrics}
                  metricOverrides={report.args.metricOverrides ?? []}
                  guardrails={report.args.guardrails}
                  id={report.id}
                  statsEngine={report.args.statsEngine || DEFAULT_STATS_ENGINE}
                  pValueCorrection={pValueCorrection}
                  regressionAdjustmentEnabled={regressionAdjustmentEnabled}
                  metricRegressionAdjustmentStatuses={
                    report.args.metricRegressionAdjustmentStatuses
                  }
                  sequentialTestingEnabled={sequentialTestingEnabled}
                  differenceType={"relative"}
                  isTabActive={true}
                />
              </div>
            )}
          {hasData && (
            <div className="row align-items-center mx-2 my-3">
              <div className="col-auto small" style={{ lineHeight: 1.2 }}>
                <div className="text-muted mb-1">
                  The above results were computed with:
                </div>
                <div>
                  <span className="text-muted">Engine:</span>{" "}
                  <span>
                    {report.args?.statsEngine === "frequentist"
                      ? "Frequentist"
                      : "Bayesian"}
                  </span>
                </div>
                {report.args?.statsEngine === "frequentist" && (
                  <>
                    <div>
                      <span className="text-muted">
                        <GBCuped size={13} /> CUPED:
                      </span>{" "}
                      <span>
                        {report.args?.regressionAdjustmentEnabled
                          ? "Enabled"
                          : "Disabled"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted">
                        <GBSequential size={13} /> Sequential:
                      </span>{" "}
                      <span>
                        {report.args?.sequentialTestingEnabled
                          ? "Enabled"
                          : "Disabled"}
                      </span>
                    </div>
                  </>
                )}
                <div>
                  <span className="text-muted">Run date:</span>{" "}
                  <span>
                    {getValidDate(report.runStarted).toLocaleString([], {
                      year: "numeric",
                      month: "numeric",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </Tab>
        {permissions.check("createAnalyses", "") && (
          <Tab
            key="configuration"
            anchor="configuration"
            display="Configuration"
            visible={permissions.check("createAnalyses", "")}
            forceRenderOnFocus={true}
          >
            <h2>Configuration</h2>
            <ConfigureReport
              mutate={mutate}
              report={report}
              viewResults={() => setActive("Results")}
            />
          </Tab>
        )}
      </ControlledTabs>
    </div>
  );
}
