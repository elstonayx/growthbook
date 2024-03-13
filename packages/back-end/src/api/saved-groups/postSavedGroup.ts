import { validateCondition } from "shared/util";
import { postSavedGroupValidator } from "@back-end/src/validators/openapi";
import { PostSavedGroupResponse } from "@back-end/types/openapi";
import {
  createSavedGroup,
  toSavedGroupApiInterface,
} from "@back-end/src/models/SavedGroupModel";
import { createApiRequestHandler } from "@back-end/src/util/handler";

export const postSavedGroup = createApiRequestHandler(postSavedGroupValidator)(
  async (req): Promise<PostSavedGroupResponse> => {
    req.checkPermissions("manageSavedGroups");

    const { name, attributeKey, values, condition, owner } = req.body;
    let { type } = req.body;

    // Infer type from arguments if not specified
    if (!type) {
      if (condition) {
        type = "condition";
      } else if (attributeKey && values) {
        type = "list";
      }
    }

    // If this is a condition group, make sure the condition is valid and not empty
    if (type === "condition") {
      if (attributeKey || values) {
        throw new Error(
          "Cannot specify attributeKey or values for condition groups"
        );
      }

      const conditionRes = validateCondition(condition);
      if (!conditionRes.success) {
        throw new Error(conditionRes.error);
      }
      if (conditionRes.empty) {
        throw new Error("Condition cannot be empty");
      }
    }
    // If this is a list group, make sure the attributeKey is specified
    else if (type === "list") {
      if (!attributeKey || !values) {
        throw new Error(
          "Must specify an attributeKey and values for list groups"
        );
      }
      if (condition) {
        throw new Error("Cannot specify a condition for list groups");
      }
    } else {
      throw new Error("Must specify a saved group type");
    }

    const savedGroup = await createSavedGroup(req.organization.id, {
      type: type,
      values: values || [],
      groupName: name,
      owner: owner || "",
      condition: condition || "",
      attributeKey,
    });

    return {
      savedGroup: toSavedGroupApiInterface(savedGroup),
    };
  }
);
