import Express, {
  ExpressRequest,
  ExpressResponse,
  ExpressRouter,
} from "../Utils/Express";
import Response from "../Utils/Response";
import SlackAuthorization from "../Middleware/SlackAuthorization";
import BadRequestException from "../../Types/Exception/BadRequestException";
import logger from "../Utils/Logger";
import { JSONObject } from "../../Types/JSON";
import BadDataException from "../../Types/Exception/BadDataException";
import {
  AppApiClientUrl,
  DashboardClientUrl,
  Host,
  HttpProtocol,
  SlackAppClientId,
  SlackAppClientSecret,
} from "../EnvironmentConfig";
import SlackAppManifest from "../Utils/Workspace/Slack/app-manifest.json";
import URL from "../../Types/API/URL";
import HTTPErrorResponse from "../../Types/API/HTTPErrorResponse";
import HTTPResponse from "../../Types/API/HTTPResponse";
import API from "../../Utils/API";
import WorkspaceProjectAuthTokenService from "../Services/WorkspaceProjectAuthTokenService";
import ObjectID from "../../Types/ObjectID";
import WorkspaceUserAuthTokenService from "../Services/WorkspaceUserAuthTokenService";
import WorkspaceType from "../../Types/Workspace/WorkspaceType";
import SlackAuthAction, {
  SlackRequest,
} from "../Utils/Workspace/Slack/Actions/Auth";
import SlackIncidentActions from "../Utils/Workspace/Slack/Actions/Incident";
import SlackAlertActions from "../Utils/Workspace/Slack/Actions/Alert";
import SlackScheduledMaintenanceActions from "../Utils/Workspace/Slack/Actions/ScheduledMaintenance";
import LIMIT_MAX from "../../Types/Database/LimitMax";
import SlackMonitorActions from "../Utils/Workspace/Slack/Actions/Monitor";

export default class SlackAPI {
  public getRouter(): ExpressRouter {
    const router: ExpressRouter = Express.getRouter();

    router.get(
      "/slack/app-manifest",
      (req: ExpressRequest, res: ExpressResponse) => {
        // return app manifest for slack app

        let ServerURL: string = new URL(HttpProtocol, Host).toString();

        //remove trailing slash if present.
        if (ServerURL.endsWith("/")) {
          ServerURL = ServerURL.slice(0, -1);
        }

        // replace SERVER_URL in the manifest with the actual server url.
        const manifestInString: string = JSON.stringify(
          SlackAppManifest,
        ).replace(/{{SERVER_URL}}/g, ServerURL.toString());

        // convert it back to json.
        const manifest: JSONObject = JSON.parse(manifestInString);

        return Response.sendJsonObjectResponse(req, res, manifest);
      },
    );

    router.get(
      "/slack/auth/:projectId/:userId",
      async (req: ExpressRequest, res: ExpressResponse) => {
        if (!SlackAppClientId) {
          return Response.sendErrorResponse(
            req,
            res,
            new BadDataException("Slack App Client ID is not set"),
          );
        }

        if (!SlackAppClientSecret) {
          return Response.sendErrorResponse(
            req,
            res,
            new BadDataException("Slack App Client Secret is not set"),
          );
        }

        const projectId: string | undefined =
          req.params["projectId"]?.toString();
        const userId: string | undefined = req.params["userId"]?.toString();

        if (!projectId) {
          return Response.sendErrorResponse(
            req,
            res,
            new BadDataException("Invalid ProjectID in request"),
          );
        }

        if (!userId) {
          return Response.sendErrorResponse(
            req,
            res,
            new BadDataException("Invalid UserID in request"),
          );
        }

        // if there's an error query param.
        const error: string | undefined = req.query["error"]?.toString();

        const slackIntegrationPageUrl: URL = URL.fromString(
          DashboardClientUrl.toString() +
            `/${projectId.toString()}/settings/slack-integration`,
        );

        if (error) {
          return Response.redirect(
            req,
            res,
            slackIntegrationPageUrl.addQueryParam("error", error),
          );
        }

        // slack returns the code on successful auth.
        const code: string | undefined = req.query["code"]?.toString();

        if (!code) {
          return Response.sendErrorResponse(
            req,
            res,
            new BadRequestException("Invalid request"),
          );
        }

        // get access token from slack api.

        const redirectUri: URL = URL.fromString(
          `${AppApiClientUrl.toString()}/slack/auth/${projectId}/${userId}`,
        );

        const requestBody: JSONObject = {
          code: code,
          client_id: SlackAppClientId,
          client_secret: SlackAppClientSecret,
          redirect_uri: redirectUri.toString(),
        };

        logger.debug("Slack Auth Request Body: ");
        logger.debug(requestBody);

        // send the request to slack api to get the access token https://slack.com/api/oauth.v2.access

        const response: HTTPErrorResponse | HTTPResponse<JSONObject> =
          await API.post(
            URL.fromString("https://slack.com/api/oauth.v2.access"),
            requestBody,
            {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          );

        if (response instanceof HTTPErrorResponse) {
          throw response;
        }

        const responseBody: JSONObject = response.data;

        logger.debug("Slack Auth Request Body: ");
        logger.debug(responseBody);

        let slackTeamId: string | undefined = undefined;
        let slackBotAccessToken: string | undefined = undefined;
        let slackUserId: string | undefined = undefined;
        let slackTeamName: string | undefined = undefined;
        let botUserId: string | undefined = undefined;
        let slackUserAccessToken: string | undefined = undefined;

        // ReponseBody is in this format.
        //   {
        //     "ok": true,
        //     "access_token": "sample-token",
        //     "token_type": "bot",
        //     "scope": "commands,incoming-webhook",
        //     "bot_user_id": "U0KRQLJ9H",
        //     "app_id": "A0KRD7HC3",
        //     "team": {
        //         "name": "Slack Pickleball Team",
        //         "id": "T9TK3CUKW"
        //     },
        //     "enterprise": {
        //         "name": "slack-pickleball",
        //         "id": "E12345678"
        //     },
        //     "authed_user": {
        //         "id": "U1234",
        //         "scope": "chat:write",
        //         "access_token": "sample-token",
        //         "token_type": "user"
        //     }
        // }

        if (responseBody["ok"] !== true) {
          return Response.sendErrorResponse(
            req,
            res,
            new BadRequestException("Invalid request"),
          );
        }

        if (
          responseBody["team"] &&
          (responseBody["team"] as JSONObject)["id"]
        ) {
          slackTeamId = (responseBody["team"] as JSONObject)["id"]?.toString();
        }

        if (responseBody["access_token"]) {
          slackBotAccessToken = responseBody["access_token"]?.toString();
        }

        if (
          responseBody["authed_user"] &&
          (responseBody["authed_user"] as JSONObject)["id"]
        ) {
          slackUserId = (responseBody["authed_user"] as JSONObject)[
            "id"
          ]?.toString();
        }

        if (
          responseBody["authed_user"] &&
          (responseBody["authed_user"] as JSONObject)["access_token"]
        ) {
          slackUserAccessToken = (responseBody["authed_user"] as JSONObject)[
            "access_token"
          ]?.toString();
        }

        if (
          responseBody["team"] &&
          (responseBody["team"] as JSONObject)["name"]
        ) {
          slackTeamName = (responseBody["team"] as JSONObject)[
            "name"
          ]?.toString();
        }

        if (responseBody["bot_user_id"]) {
          botUserId = responseBody["bot_user_id"]?.toString();
        }

        await WorkspaceProjectAuthTokenService.refreshAuthToken({
          projectId: new ObjectID(projectId),
          workspaceType: WorkspaceType.Slack,
          authToken: slackBotAccessToken || "",
          workspaceProjectId: slackTeamId || "",
          miscData: {
            teamId: slackTeamId || "",
            teamName: slackTeamName || "",
            botUserId: botUserId || "",
          },
        });

        await WorkspaceUserAuthTokenService.refreshAuthToken({
          projectId: new ObjectID(projectId),
          userId: new ObjectID(userId),
          workspaceType: WorkspaceType.Slack,
          authToken: slackUserAccessToken || "",
          workspaceUserId: slackUserId || "",
          miscData: {
            userId: slackUserId || "",
          },
        });

        // return back to dashboard after successful auth.
        Response.redirect(req, res, slackIntegrationPageUrl);
      },
    );

    router.post(
      "/slack/interactive",
      SlackAuthorization.isAuthorizedSlackRequest,
      async (req: ExpressRequest, res: ExpressResponse) => {
        logger.debug("Slack Interactive Request: ");

        const authResult: SlackRequest = await SlackAuthAction.isAuthorized({
          req: req,
        });

        logger.debug("Slack Interactive Auth Result: ");
        logger.debug(authResult);

        // if slack uninstall app then,
        if (authResult.payloadType === "app_uninstall") {
          logger.debug("Slack App Uninstall Request: ");

          // remove the project auth and user auth.

          // delete all user auth tokens for this project.
          await WorkspaceUserAuthTokenService.deleteBy({
            query: {
              projectId: authResult.projectId,
              workspaceType: WorkspaceType.Slack,
            },
            limit: LIMIT_MAX,
            skip: 0,
            props: {
              isRoot: true,
            },
          });

          await WorkspaceProjectAuthTokenService.deleteBy({
            query: {
              projectId: authResult.projectId,
              workspaceType: WorkspaceType.Slack,
            },
            limit: 1,
            skip: 0,
            props: {
              isRoot: true,
            },
          });

          logger.debug("Slack App Uninstall Request: Deleted all auth tokens.");
          // return empty response.

          return Response.sendTextResponse(req, res, "");
        }

        if (authResult.isAuthorized === false) {
          // return empty response if not authorized. Do nothing in this case.
          return Response.sendTextResponse(req, res, "");
        }

        for (const action of authResult.actions || []) {
          if (!action.actionType) {
            return Response.sendErrorResponse(
              req,
              res,
              new BadRequestException("Invalid request"),
            );
          }

          if (
            SlackIncidentActions.isIncidentAction({
              actionType: action.actionType,
            })
          ) {
            return SlackIncidentActions.handleIncidentAction({
              slackRequest: authResult,
              action: action,
              req: req,
              res: res,
            });
          }

          if (
            SlackAlertActions.isAlertAction({
              actionType: action.actionType,
            })
          ) {
            return SlackAlertActions.handleAlertAction({
              slackRequest: authResult,
              action: action,
              req: req,
              res: res,
            });
          }

          if (
            SlackMonitorActions.isMonitorAction({
              actionType: action.actionType,
            })
          ) {
            return SlackMonitorActions.handleMonitorAction({
              slackRequest: authResult,
              action: action,
              req: req,
              res: res,
            });
          }

          if (
            SlackScheduledMaintenanceActions.isScheduledMaintenanceAction({
              actionType: action.actionType,
            })
          ) {
            return SlackScheduledMaintenanceActions.handleScheduledMaintenanceAction(
              {
                slackRequest: authResult,
                action: action,
                req: req,
                res: res,
              },
            );
          }
        }

        return Response.sendErrorResponse(
          req,
          res,
          new BadRequestException("Invalid request"),
        );
      },
    );

    // options load endpoint.

    router.post(
      "/slack/options-load",
      SlackAuthorization.isAuthorizedSlackRequest,
      (req: ExpressRequest, res: ExpressResponse) => {
        return Response.sendJsonObjectResponse(req, res, {
          response_action: "clear",
        });
      },
    );

    return router;
  }
}
