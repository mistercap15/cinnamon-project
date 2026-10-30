import { MedusaService } from "@medusajs/framework/utils";
import { ReturnRequest } from "./models/request";
export default class AftercareService extends MedusaService({
  ReturnRequest,
}) {}
