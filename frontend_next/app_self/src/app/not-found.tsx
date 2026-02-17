
import { redirect } from "next/navigation";
import { default_app_url } from "../app/to/app_conf";

export default function NotFound() {
  redirect(default_app_url);
}
