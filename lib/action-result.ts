export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string> }

export function actionOk<T>(message?: string, data?: T): ActionResult<T> {
  return { ok: true, message, data }
}

export function actionError(message: string, fieldErrors?: Record<string, string>): ActionResult {
  return { ok: false, message, fieldErrors }
}
