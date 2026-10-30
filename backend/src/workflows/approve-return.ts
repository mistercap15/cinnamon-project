import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  beginReturnOrderWorkflow,
  requestItemReturnWorkflow,
  confirmReturnRequestWorkflow,
} from "@medusajs/medusa/core-flows";
export const approveReturnWorkflow = createWorkflow(
  "approve-ceylon-return",
  (input: any) => {
    const started = beginReturnOrderWorkflow.runAsStep({
      input: transform(input, (i: any) => ({
        order_id: i.order_id,
        location_id: i.location_id,
        created_by: i.created_by,
        metadata: { aftercare_request_id: i.request_id },
        no_notification: true,
      })),
    });
    const requested = requestItemReturnWorkflow.runAsStep({
      input: transform({ started, input }, ({ started, input }: any) => ({
        return_id: started.return_id,
        items: input.items.map((item: any) => ({
          id: item.id,
          quantity: item.quantity,
        })),
      })),
    });
    confirmReturnRequestWorkflow.runAsStep({
      input: transform(
        { started, input, requested },
        ({ started, input }: any) => ({
          return_id: started.return_id,
          confirmed_by: input.created_by,
          no_notification: true,
        }),
      ),
    });
    return new WorkflowResponse(started);
  },
);
