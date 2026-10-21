import type { Route } from "./+types/_app.courses.join";
import { joinCourseAction, JoinCoursePage } from "~/features/authoring";

export async function clientAction(args: Route.ClientActionArgs) {
  return joinCourseAction(args);
}

export function meta() {
  return [{ title: "Gabung Course | NALAR" }];
}

export default function JoinCourseRoute({ actionData }: Route.ComponentProps) {
  return <JoinCoursePage result={actionData} />;
}
