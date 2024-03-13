import type { Response } from "express";
import { getContextFromReq } from "@back-end/src/services/organizations";
import { ApiErrorResponse } from "@back-end/types/api";
import { TagInterface } from "@back-end/types/tag";
import { addTag, removeTag } from "@back-end/src/models/TagModel";
import { removeTagInMetrics } from "@back-end/src/models/MetricModel";
import { removeTagInFeature } from "@back-end/src/models/FeatureModel";
import { removeTagFromSlackIntegration } from "@back-end/src/models/SlackIntegrationModel";
import { removeTagFromExperiments } from "@back-end/src/models/ExperimentModel";
import { AuthRequest } from "@back-end/src/types/AuthRequest";
import { EventAuditUserForResponseLocals } from "@back-end/src/events/event-types";

// region POST /tag

type CreateTagRequest = AuthRequest<TagInterface>;

type CreateTagResponse = {
  status: 200;
};

/**
 * POST /tag
 * Create a tag resource
 * @param req
 * @param res
 */
export const postTag = async (
  req: CreateTagRequest,
  res: Response<CreateTagResponse>
) => {
  req.checkPermissions("manageTags");

  const { org } = getContextFromReq(req);
  const { id, color, description } = req.body;

  await addTag(org.id, id, color, description);

  res.status(200).json({
    status: 200,
  });
};

// endregion POST /tag

// region DELETE /tag/:id

type DeleteTagRequest = AuthRequest<{ id: string }, { id: string }>;

type DeleteTagResponse = {
  status: 200;
};

/**
 * DELETE /tag/
 * Delete one tag resource by ID
 * @param req
 * @param res
 */
export const deleteTag = async (
  req: DeleteTagRequest,
  res: Response<
    DeleteTagResponse | ApiErrorResponse,
    EventAuditUserForResponseLocals
  >
) => {
  req.checkPermissions("manageTags");

  const context = getContextFromReq(req);
  const { org } = context;
  const { id } = req.body;

  // experiments
  await removeTagFromExperiments({
    context,
    tag: id,
  });

  // metrics
  await removeTagInMetrics(org.id, id);

  // features
  await removeTagInFeature(context, id);

  // Slack integrations
  await removeTagFromSlackIntegration({ organizationId: org.id, tag: id });

  // finally, remove the tag itself
  await removeTag(org.id, id);

  res.status(200).json({
    status: 200,
  });
};

// endregion DELETE /tag/:id
