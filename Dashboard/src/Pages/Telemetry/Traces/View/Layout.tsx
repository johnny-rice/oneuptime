import { getTelemetryBreadcrumbs } from "../../../../Utils/Breadcrumbs";
import { RouteUtil } from "../../../../Utils/RouteMap";
import PageComponentProps from "../../../PageComponentProps";
import Page from "CommonUI/src/Components/Page/Page";
import Navigation from "CommonUI/src/Utils/Navigation";
import React, { FunctionComponent, ReactElement } from "react";
import { Outlet } from "react-router-dom";

const TracesLayout: FunctionComponent<
  PageComponentProps
> = (): ReactElement => {
  const path: string = Navigation.getRoutePath(RouteUtil.getRoutes());
  return (
    <Page
      title="Trace Explorer"
      breadcrumbLinks={getTelemetryBreadcrumbs(path)}
    >
      <Outlet />
    </Page>
  );
};

export default TracesLayout;
