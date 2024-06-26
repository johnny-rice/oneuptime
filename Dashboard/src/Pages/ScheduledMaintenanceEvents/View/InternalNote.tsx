import UserElement from "../../../Components/User/User";
import DashboardNavigation from "../../../Utils/Navigation";
import ProjectUser from "../../../Utils/ProjectUser";
import PageComponentProps from "../../PageComponentProps";
import BaseModel from "Common/Models/BaseModel";
import { LIMIT_PER_PROJECT } from "Common/Types/Database/LimitMax";
import BadDataException from "Common/Types/Exception/BadDataException";
import IconProp from "Common/Types/Icon/IconProp";
import { JSONObject } from "Common/Types/JSON";
import ObjectID from "Common/Types/ObjectID";
import { ButtonStyleType } from "CommonUI/src/Components/Button/Button";
import BasicFormModal from "CommonUI/src/Components/FormModal/BasicFormModal";
import FormFieldSchemaType from "CommonUI/src/Components/Forms/Types/FormFieldSchemaType";
import ConfirmModal from "CommonUI/src/Components/Modal/ConfirmModal";
import { ModalWidth } from "CommonUI/src/Components/Modal/Modal";
import { ShowAs } from "CommonUI/src/Components/ModelTable/BaseModelTable";
import ModelTable from "CommonUI/src/Components/ModelTable/ModelTable";
import FieldType from "CommonUI/src/Components/Types/FieldType";
import AlignItem from "CommonUI/src/Types/AlignItem";
import API from "CommonUI/src/Utils/API/API";
import DropdownUtil from "CommonUI/src/Utils/Dropdown";
import ModelAPI, { ListResult } from "CommonUI/src/Utils/ModelAPI/ModelAPI";
import Navigation from "CommonUI/src/Utils/Navigation";
import ScheduledMaintenanceInternalNote from "Model/Models/ScheduledMaintenanceInternalNote";
import ScheduledMaintenanceNoteTemplate from "Model/Models/ScheduledMaintenanceNoteTemplate";
import User from "Model/Models/User";
import React, {
  Fragment,
  FunctionComponent,
  ReactElement,
  useState,
} from "react";

const ScheduledMaintenanceDelete: FunctionComponent<PageComponentProps> = (
  props: PageComponentProps,
): ReactElement => {
  const modelId: ObjectID = Navigation.getLastParamAsObjectID(1);

  const [
    scheduledMaintenanceNoteTemplates,
    setScheduledMaintenanceNoteTemplates,
  ] = useState<Array<ScheduledMaintenanceNoteTemplate>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [
    showScheduledMaintenanceNoteTemplateModal,
    setShowScheduledMaintenanceNoteTemplateModal,
  ] = useState<boolean>(false);
  const [
    initialValuesForScheduledMaintenance,
    setInitialValuesForScheduledMaintenance,
  ] = useState<JSONObject>({});

  const fetchScheduledMaintenanceNoteTemplate: (
    id: ObjectID,
  ) => Promise<void> = async (id: ObjectID): Promise<void> => {
    setError("");
    setIsLoading(true);

    try {
      //fetch scheduledMaintenance template

      const scheduledMaintenanceNoteTemplate: ScheduledMaintenanceNoteTemplate | null =
        await ModelAPI.getItem<ScheduledMaintenanceNoteTemplate>({
          modelType: ScheduledMaintenanceNoteTemplate,
          id,
          select: {
            note: true,
          },
        });

      if (scheduledMaintenanceNoteTemplate) {
        const initialValue: JSONObject = {
          ...BaseModel.toJSONObject(
            scheduledMaintenanceNoteTemplate,
            ScheduledMaintenanceNoteTemplate,
          ),
        };

        setInitialValuesForScheduledMaintenance(initialValue);
      }
    } catch (err) {
      setError(API.getFriendlyMessage(err));
    }

    setIsLoading(false);
    setShowScheduledMaintenanceNoteTemplateModal(false);
  };

  const fetchScheduledMaintenanceNoteTemplates: () => Promise<void> =
    async (): Promise<void> => {
      setError("");
      setIsLoading(true);
      setInitialValuesForScheduledMaintenance({});

      try {
        const listResult: ListResult<ScheduledMaintenanceNoteTemplate> =
          await ModelAPI.getList<ScheduledMaintenanceNoteTemplate>({
            modelType: ScheduledMaintenanceNoteTemplate,
            query: {},
            limit: LIMIT_PER_PROJECT,
            skip: 0,
            select: {
              templateName: true,
              _id: true,
            },
            sort: {},
          });

        setScheduledMaintenanceNoteTemplates(listResult.data);
      } catch (err) {
        setError(API.getFriendlyMessage(err));
      }

      setIsLoading(false);
    };

  return (
    <Fragment>
      <ModelTable<ScheduledMaintenanceInternalNote>
        modelType={ScheduledMaintenanceInternalNote}
        id="table-scheduled-maintenance-internal-note"
        name="Scheduled Maintenance Events > Internal Note"
        isDeleteable={true}
        isCreateable={true}
        isEditable={true}
        isViewable={false}
        showViewIdButton={true}
        createEditModalWidth={ModalWidth.Large}
        query={{
          scheduledMaintenanceId: modelId,
          projectId: DashboardNavigation.getProjectId()?.toString(),
        }}
        showCreateForm={
          Object.keys(initialValuesForScheduledMaintenance).length > 0
        }
        createInitialValues={initialValuesForScheduledMaintenance}
        onBeforeCreate={(
          item: ScheduledMaintenanceInternalNote,
        ): Promise<ScheduledMaintenanceInternalNote> => {
          if (!props.currentProject || !props.currentProject._id) {
            throw new BadDataException("Project ID cannot be null");
          }
          item.scheduledMaintenanceId = modelId;
          item.projectId = new ObjectID(props.currentProject._id);
          return Promise.resolve(item);
        }}
        cardProps={{
          title: "Private Notes",
          buttons: [
            {
              title: "Create from Template",
              icon: IconProp.Template,
              buttonStyle: ButtonStyleType.OUTLINE,
              onClick: async (): Promise<void> => {
                setShowScheduledMaintenanceNoteTemplateModal(true);
                await fetchScheduledMaintenanceNoteTemplates();
              },
            },
          ],
          description: "Here are private notes for this scheduled maintenance.",
        }}
        noItemsMessage={
          "No private notes created for this scheduled maintenance so far."
        }
        formFields={[
          {
            field: {
              note: true,
            },
            title: "Private Scheduled Maintenance Note",
            fieldType: FormFieldSchemaType.Markdown,
            required: true,
            description:
              "Add a private note to this scheduled maintenance here. This is in Markdown.",
          },
        ]}
        showRefreshButton={true}
        showAs={ShowAs.List}
        viewPageRoute={Navigation.getCurrentRoute()}
        filters={[
          {
            field: {
              createdByUser: true,
            },
            type: FieldType.Entity,
            title: "Created By",
            filterEntityType: User,
            fetchFilterDropdownOptions: async () => {
              return await ProjectUser.fetchProjectUsersAsDropdownOptions(
                DashboardNavigation.getProjectId()!,
              );
            },
            filterDropdownField: {
              label: "name",
              value: "_id",
            },
          },
          {
            field: {
              note: true,
            },
            type: FieldType.Text,
            title: "Note",
          },
          {
            field: {
              createdAt: true,
            },
            type: FieldType.Date,
            title: "Created At",
          },
        ]}
        columns={[
          {
            field: {
              createdByUser: {
                name: true,
                email: true,
                profilePictureId: true,
              },
            },
            title: "",

            type: FieldType.Entity,

            getElement: (
              item: ScheduledMaintenanceInternalNote,
            ): ReactElement => {
              return (
                <UserElement
                  user={item["createdByUser"]}
                  suffix={"wrote"}
                  usernameClassName={"text-base text-gray-900"}
                  suffixClassName={"text-base text-gray-500 mt-1"}
                />
              );
            },
          },
          {
            field: {
              createdAt: true,
            },

            alignItem: AlignItem.Right,
            title: "",
            type: FieldType.DateTime,
            contentClassName:
              "mt-1 whitespace-nowrap text-sm text-gray-600 sm:mt-0 sm:ml-3 text-right",
          },
          {
            field: {
              note: true,
            },

            title: "",
            type: FieldType.Markdown,
            contentClassName: "-mt-3 space-y-6 text-sm text-gray-800",
            colSpan: 2,
          },
        ]}
      />

      {scheduledMaintenanceNoteTemplates.length === 0 &&
      showScheduledMaintenanceNoteTemplateModal &&
      !isLoading ? (
        <ConfirmModal
          title={`No ScheduledMaintenance Note Templates`}
          description={`No scheduled maintenance note templates have been created yet. You can create these in Project Settings > Scheduled Maintenance > Note Templates.`}
          submitButtonText={"Close"}
          onSubmit={() => {
            return setShowScheduledMaintenanceNoteTemplateModal(false);
          }}
        />
      ) : (
        <></>
      )}

      {error ? (
        <ConfirmModal
          title={`Error`}
          description={`${error}`}
          submitButtonText={"Close"}
          onSubmit={() => {
            return setError("");
          }}
        />
      ) : (
        <></>
      )}

      {showScheduledMaintenanceNoteTemplateModal &&
      scheduledMaintenanceNoteTemplates.length > 0 ? (
        <BasicFormModal<JSONObject>
          title="Create Note from Template"
          isLoading={isLoading}
          submitButtonText="Create from Template"
          onClose={() => {
            setShowScheduledMaintenanceNoteTemplateModal(false);
            setIsLoading(false);
          }}
          onSubmit={async (data: JSONObject) => {
            await fetchScheduledMaintenanceNoteTemplate(
              data["scheduledMaintenanceNoteTemplateId"] as ObjectID,
            );
          }}
          formProps={{
            initialValues: {},
            fields: [
              {
                field: {
                  scheduledMaintenanceNoteTemplateId: true,
                },
                title: "Select Note Template",
                description: "Select a template to create a note from.",
                fieldType: FormFieldSchemaType.Dropdown,
                dropdownOptions: DropdownUtil.getDropdownOptionsFromEntityArray(
                  {
                    array: scheduledMaintenanceNoteTemplates,
                    labelField: "templateName",
                    valueField: "_id",
                  },
                ),
                required: true,
                placeholder: "Select Template",
              },
            ],
          }}
        />
      ) : (
        <> </>
      )}
    </Fragment>
  );
};

export default ScheduledMaintenanceDelete;
