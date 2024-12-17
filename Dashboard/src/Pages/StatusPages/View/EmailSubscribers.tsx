import DashboardNavigation from "../../../Utils/Navigation";
import PageComponentProps from "../../PageComponentProps";
import NotNull from "Common/Types/BaseDatabase/NotNull";
import { Green, Red, Yellow } from "Common/Types/BrandColors";
import BadDataException from "Common/Types/Exception/BadDataException";
import { PromiseVoidFunction } from "Common/Types/FunctionTypes";
import ObjectID from "Common/Types/ObjectID";
import Alert, { AlertType } from "Common/UI/Components/Alerts/Alert";
import { CategoryCheckboxOptionsAndCategories } from "Common/UI/Components/CategoryCheckbox/Index";
import ErrorMessage from "Common/UI/Components/ErrorMessage/ErrorMessage";
import { ModelField } from "Common/UI/Components/Forms/ModelForm";
import FormFieldSchemaType from "Common/UI/Components/Forms/Types/FormFieldSchemaType";
import FormValues from "Common/UI/Components/Forms/Types/FormValues";
import PageLoader from "Common/UI/Components/Loader/PageLoader";
import ModelTable from "Common/UI/Components/ModelTable/ModelTable";
import Pill from "Common/UI/Components/Pill/Pill";
import FieldType from "Common/UI/Components/Types/FieldType";
import API from "Common/UI/Utils/API/API";
import ModelAPI from "Common/UI/Utils/ModelAPI/ModelAPI";
import Navigation from "Common/UI/Utils/Navigation";
import SubscriberUtil from "Common/UI/Utils/StatusPage";
import StatusPage from "Common/Models/DatabaseModels/StatusPage";
import StatusPageSubscriber from "Common/Models/DatabaseModels/StatusPageSubscriber";
import React, {
  Fragment,
  FunctionComponent,
  ReactElement,
  useEffect,
  useState,
} from "react";

const StatusPageDelete: FunctionComponent<PageComponentProps> = (
  props: PageComponentProps,
): ReactElement => {
  const modelId: ObjectID = Navigation.getLastParamAsObjectID(1);
  const [
    allowSubscribersToChooseResources,
    setAllowSubscribersToChooseResources,
  ] = React.useState<boolean>(false);

  const [
    allowSubscribersToChooseEventTypes,
    setAllowSubscribersToChooseEventTypes,
  ] = React.useState<boolean>(false);

  const [isEmailSubscribersEnabled, setIsEmailSubscribersEnabled] =
    React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string>("");
  const [
    categoryCheckboxOptionsAndCategories,
    setCategoryCheckboxOptionsAndCategories,
  ] = useState<CategoryCheckboxOptionsAndCategories>({
    categories: [],
    options: [],
  });

  const fetchCheckboxOptionsAndCategories: PromiseVoidFunction =
    async (): Promise<void> => {
      const result: CategoryCheckboxOptionsAndCategories =
        await SubscriberUtil.getCategoryCheckboxPropsBasedOnResources(modelId);

      setCategoryCheckboxOptionsAndCategories(result);
    };

  const fetchStatusPage: PromiseVoidFunction = async (): Promise<void> => {
    try {
      setIsLoading(true);

      const statusPage: StatusPage | null = await ModelAPI.getItem({
        modelType: StatusPage,
        id: modelId,
        select: {
          allowSubscribersToChooseResources: true,
          allowSubscribersToChooseEventTypes: true,
          enableEmailSubscribers: true,
        },
      });

      if (statusPage && statusPage.allowSubscribersToChooseResources) {
        setAllowSubscribersToChooseResources(
          statusPage.allowSubscribersToChooseResources,
        );
        await fetchCheckboxOptionsAndCategories();
      }

      if (statusPage && statusPage.allowSubscribersToChooseEventTypes) {
        setAllowSubscribersToChooseEventTypes(
          statusPage.allowSubscribersToChooseEventTypes,
        );
      }

      if (statusPage && statusPage.enableEmailSubscribers) {
        setIsEmailSubscribersEnabled(statusPage.enableEmailSubscribers);
      }

      setIsLoading(false);
    } catch (err) {
      setError(API.getFriendlyMessage(err));
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchStatusPage().catch((err: Error) => {
      setError(API.getFriendlyMessage(err));
    });
  }, []);

  const [formFields, setFormFields] = React.useState<
    Array<ModelField<StatusPageSubscriber>>
  >([]);

  useEffect(() => {
    if (isLoading) {
      return; // don't do anything if loading
    }

    const formFields: Array<ModelField<StatusPageSubscriber>> = [
      {
        field: {
          subscriberEmail: true,
        },
        title: "Email",
        description: "Status page updates will be sent to this email.",
        fieldType: FormFieldSchemaType.Email,
        required: true,
        placeholder: "subscriber@company.com",
      },
      {
        field: {
          isSubscriptionConfirmed: true,
        },
        title: "Send Confirmation Email",
        description:
          "Send a confirmation email to this subscriber with a link to confirm subscription.",
        fieldType: FormFieldSchemaType.Toggle,
        required: false,
        doNotShowWhenEditing: true,
      },
      {
        field: {
          sendYouHaveSubscribedMessage: true,
        },
        title: "Send Subscription Email",
        description:
          'Send "You have subscribed to this status page" email to this subscriber?',
        fieldType: FormFieldSchemaType.Toggle,
        required: false,
        doNotShowWhenEditing: true,
      },
      {
        field: {
          isUnsubscribed: true,
        },
        title: "Unsubscribe",
        description: "Unsubscribe this email from the status page.",
        fieldType: FormFieldSchemaType.Toggle,
        required: false,
        doNotShowWhenCreating: true,
      },
    ];

    if (allowSubscribersToChooseResources) {
      formFields.push({
        field: {
          isSubscribedToAllResources: true,
        },
        title: "Subscribe to All Resources",
        description: "Send notifications for all resources.",
        fieldType: FormFieldSchemaType.Checkbox,
        required: false,
        defaultValue: true,
      });

      formFields.push({
        field: {
          statusPageResources: true,
        },
        title: "Select Resources to Subscribe",
        description: "Please select the resources you want to subscribe to.",
        fieldType: FormFieldSchemaType.CategoryCheckbox,
        required: false,
        categoryCheckboxProps: categoryCheckboxOptionsAndCategories,
        showIf: (model: FormValues<StatusPageSubscriber>) => {
          return !model || !model.isSubscribedToAllResources;
        },
      });
    }

    if (allowSubscribersToChooseEventTypes) {
      formFields.push({
        field: {
          isSubscribedToAllEventTypes: true,
        },
        title: "Subscribe to All Event Types",
        description:
          "Select this option if you want to subscribe to all event types.",
        fieldType: FormFieldSchemaType.Checkbox,
        required: false,
        defaultValue: true,
      });

      formFields.push({
        field: {
          statusPageEventTypes: true,
        },
        title: "Select Event Types to Subscribe",
        description: "Please select the event types you want to subscribe to.",
        fieldType: FormFieldSchemaType.MultiSelectDropdown,
        required: false,
        dropdownOptions: SubscriberUtil.getDropdownPropsBasedOnEventTypes(),
        showIf: (model: FormValues<StatusPageSubscriber>) => {
          return !model || !model.isSubscribedToAllEventTypes;
        },
      });
    }

    setFormFields(formFields);
  }, [isLoading]);

  return (
    <Fragment>
      {isLoading ? <PageLoader isVisible={true} /> : <></>}

      {error ? <ErrorMessage error={error} /> : <></>}

      {!error && !isLoading ? (
        <>
          {!isEmailSubscribersEnabled && (
            <Alert
              type={AlertType.DANGER}
              title="Email subscribers are not enabled for this status page. Please enable it in Subscriber Settings"
            />
          )}
          <ModelTable<StatusPageSubscriber>
            modelType={StatusPageSubscriber}
            id="table-subscriber"
            name="Status Page > Email Subscribers"
            isDeleteable={true}
            showViewIdButton={true}
            isCreateable={true}
            isEditable={true}
            isViewable={false}
            selectMoreFields={{
              subscriberPhone: true,
              isSubscriptionConfirmed: true,
            }}
            query={{
              statusPageId: modelId,
              projectId: DashboardNavigation.getProjectId()!,
              subscriberEmail: new NotNull(),
            }}
            onBeforeCreate={(
              item: StatusPageSubscriber,
            ): Promise<StatusPageSubscriber> => {
              if (!props.currentProject || !props.currentProject._id) {
                throw new BadDataException("Project ID cannot be null");
              }

              item.statusPageId = modelId;
              item.projectId = new ObjectID(props.currentProject._id);
              return Promise.resolve(item);
            }}
            cardProps={{
              title: "Email Subscribers",
              description:
                "Here are the list of subscribers who have subscribed to the status page.",
            }}
            noItemsMessage={"No subscribers found."}
            formFields={formFields}
            showRefreshButton={true}
            filters={[
              {
                field: {
                  subscriberEmail: true,
                },
                title: "Email",
                type: FieldType.Text,
              },
              {
                field: {
                  isUnsubscribed: true,
                },
                title: "Unsubscribed",
                type: FieldType.Boolean,
              },
              {
                field: {
                  createdAt: true,
                },
                title: "Subscribed At",
                type: FieldType.Date,
              },
            ]}
            viewPageRoute={Navigation.getCurrentRoute()}
            columns={[
              {
                field: {
                  subscriberEmail: true,
                },
                title: "Email",
                type: FieldType.Email,
              },
              {
                field: {
                  isUnsubscribed: true,
                },
                title: "Status",
                type: FieldType.Text,
                getElement: (item: StatusPageSubscriber): ReactElement => {
                  if (item["isUnsubscribed"]) {
                    return <Pill color={Red} text={"Unsubscribed"} />;
                  }

                  if (!item["isSubscriptionConfirmed"]) {
                    return (
                      <Pill
                        color={Yellow}
                        text={"Awaiting Confirmation"}
                        tooltip="Confirmation email sent to this user. Please click on the link to confirm subscription"
                      />
                    );
                  }

                  return <Pill color={Green} text={"Subscribed"} />;
                },
              },
              {
                field: {
                  createdAt: true,
                },
                title: "Subscribed At",
                type: FieldType.DateTime,
              },
            ]}
          />
        </>
      ) : (
        <></>
      )}
    </Fragment>
  );
};

export default StatusPageDelete;
