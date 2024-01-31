import { ActionResult } from './ActionResult';

export type Response<T> = {
  result: ActionResult<T>;
};
