import { APP_NAME } from "./main";

export const fetchToken = (token: string): Promise<string> => {
  return new Promise((res, rej) => {
    if (token === "test_app_token") {
      res(`Verify by signing below to authenticate ${APP_NAME}.`);
    } else {
      rej("Error verifying user");
    }
  });
};
