import { MedusaService } from "@medusajs/framework/utils";
import { Post } from "./models/post";
import { EmailVerification } from "./models/verification";
export default class JournalService extends MedusaService({
  Post,
  EmailVerification,
}) {}
