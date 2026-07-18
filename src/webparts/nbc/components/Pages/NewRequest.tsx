import * as React from "react";
import { useHistory } from "react-router-dom";
import Swal from "sweetalert2";
import {
  faPaperclip,
  faFileAlt,
  faChevronDown,
  faChevronUp,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { INbcProps } from "../INbcProps";
import logoPrimary from "../../assets/Images/NBC_LOGO.png";
import userLogo from "../../assets/Images/UserAvatar.png";
import EmployeeMasterOps from "../../services/BAL/EmployeeMaster";
import ChangeRequestOps, {
  IChangeRequestPayload,
} from "../../services/BAL/ChangeRequestMaster";
import SPCRUDOPS from "../../services/DAL/spcrudops";
import "./CSS/NewRequest.scss";

interface IApproverDetails {
  Id: number;
  Name: string;
  Role: string;
  Level: number;
  status: string;
}

const DOCS_LIBRARY = "NBCDocs";

const NewRequest: React.FC<INbcProps> = (props) => {
  const history = useHistory();
  const employeeMasterOps = React.useMemo(() => EmployeeMasterOps(), []);
  const changeRequestOps = React.useMemo(() => ChangeRequestOps(), []);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isRequestorValid, setIsRequestorValid] = React.useState(true);
  const [isAttachmentsOpen, setIsAttachmentsOpen] = React.useState(false);

  const [employeeData, setEmployeeData] = React.useState({
    EmployeeName: "",
    EmployeeEmail: "",
    EmployeeSAPID: "",
    Department: "",
    ContactNo: "",
    ReportingManager: "",
    Grade: "",
    CostCentre: "",
  });

  const [approverDetails, setApproverDetails] = React.useState<
    IApproverDetails[]
  >([]);

  const [changeRequestData, setChangeRequestData] = React.useState({
    ProgramConfigurationChange: "",
    RequestType: "",
    ProgramName: "",
    Tcode: "",
    Urgencyofrequest: "",
    RequestDescriptionwithReason: "",
    AdditionalInformation: "",
    Remarks: "",
  });

  const [supportingFiles, setSupportingFiles] = React.useState<File[]>([]);

  const buildApprovalFlow = async (rmData: {
    RMId: number | null;
    RM: string;
  }): Promise<void> => {
    try {
      const sp = await SPCRUDOPS();

      const baseApprovers: IApproverDetails[] = [];

      if (rmData.RMId) {
        baseApprovers.push({
          Id: rmData.RMId,
          Name: rmData.RM,
          Role: "RM",
          Level: 1,
          status: "Pending",
        });
      }

      const matrixData = await sp.getData(
        "ApprovalMatrix",
        "Title,Role,Level,User/Id,User/Title",
        "User",
        `Status eq 'Active'`,
        { column: "Level", isAscending: true },
        props,
      );

      const matrixApprovers: IApproverDetails[] = (matrixData || [])
        .filter((item: any) => item.User?.Id)
        .map((item: any, index: number) => ({
          Id: item.User.Id,
          Name: item.User.Title,
          Role: item.Role,
          Level: baseApprovers.length + index + 1,
          status: "",
        }));

      const fullFlow = [...baseApprovers, ...matrixApprovers];

      if (fullFlow.length > 0) {
        fullFlow[0].status = "Pending";
      }

      setApproverDetails(fullFlow);
    } catch (error) {
      console.error("Error building approval flow:", error);
    }
  };

  const getEmployeeDetails = async (): Promise<void> => {
    setIsLoading(true);

    try {
      const response = await employeeMasterOps.getEmployeeMasterData(
        `EmployeeEmail eq '${props.userEmail}'`,
        "",
        props,
      );

      if (response.length > 0) {
        const emp = response[0];

        setEmployeeData({
          EmployeeName: emp.EmployeeName || "",
          EmployeeEmail: emp.EmployeeEmail || "",
          EmployeeSAPID: emp.EmployeeSAPID || "",
          Department: emp.Department || "",
          ContactNo: emp.ContactNo || "",
          ReportingManager: emp.ReportingManager || "",
          Grade: emp.Grade || "",
          CostCentre: emp.CostCentre || "",
        });

        setIsRequestorValid(true);

        await buildApprovalFlow({
          RMId: emp.ReportingManagerId || null,
          RM: emp.ReportingManager || "",
        });
      } else {
        setIsRequestorValid(false);

        Swal.fire({
          title: "Requestor Details Not Found",
          text: "We couldn't load your employee details. Please contact your administrator.",
          icon: "warning",
        });
      }
    } catch (error) {
      console.error("Employee fetch error:", error);

      setIsRequestorValid(false);

      Swal.fire({
        title: "Error",
        text: "Failed to load requestor details.",
        icon: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (props.userEmail) {
      getEmployeeDetails();
    }
  }, [props.userEmail]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ): void => {
    const { name, value } = e.target;

    setChangeRequestData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files && e.target.files.length > 0) {
      setSupportingFiles((prev) => [
        ...prev,
        ...Array.from(e.target.files as FileList),
      ]);
    }
  };

  const handleRemoveFile = (fileName: string): void => {
    setSupportingFiles((prev) =>
      prev.filter((file) => file.name !== fileName),
    );
  };

  const toggleAttachments = (): void => setIsAttachmentsOpen((prev) => !prev);

  const buildPayload = (
    isDraft: boolean,
    requestNo: string,
  ): IChangeRequestPayload => {
    const currentApprover =
      approverDetails.length > 0 ? approverDetails[0].Id : null;
    const allApproversJson = JSON.stringify(approverDetails);

    const payload: IChangeRequestPayload = {
      Title: "",
      RequestNo: requestNo,
      RequestedBy: employeeData.EmployeeName,
      EmployeeEmail: props.userEmail,
      ReportingManager: employeeData.ReportingManager,
      EmployeeSAPNumberID: employeeData.EmployeeSAPID,
      CostCentre: employeeData.CostCentre,
      Department: employeeData.Department,
      Grade: employeeData.Grade,
      ContactNumber: employeeData.ContactNo
        ? Number(employeeData.ContactNo)
        : null,
      ProgramConfigurationChange: changeRequestData.ProgramConfigurationChange,
      RequestType: changeRequestData.RequestType,
      RequestDescriptionwithReason:
        changeRequestData.RequestDescriptionwithReason,
      ProgramName: changeRequestData.ProgramName,
      Tcode: changeRequestData.Tcode,
      Urgencyofrequest: changeRequestData.Urgencyofrequest,
      AdditionalInformation: changeRequestData.AdditionalInformation,
      Remarks: changeRequestData.Remarks,
      Status: isDraft ? "Save as Draft" : "Pending for Approval",
      CurrentApproverId: currentApprover,
      ApprovalMatrix: allApproversJson,
    };

    if (!isDraft) {
      payload.WorkflowHistory = JSON.stringify([
        {
          CurrentApprover: employeeData.EmployeeName,
          ActionTaken: "Request Submitted",
          Comment: changeRequestData.Remarks,
          Date: new Date().toISOString(),
          CurrentStatus: "Pending for Approval",
        },
      ]);
    }

    return payload;
  };

  const extractItemId = (response: any): number | null => {
    return response?.Id ?? response?.data?.Id ?? response?.d?.Id ?? null;
  };

  const uploadSupportingFiles = async (itemId: number): Promise<void> => {
    if (!itemId || supportingFiles.length === 0) {
      return;
    }

    const spCrudOps = await SPCRUDOPS();

    const webServerRelativeUrl = new URL(
      props.currentSPContext.pageContext.web.absoluteUrl,
    ).pathname;

    const folderUrl = `${webServerRelativeUrl}/${DOCS_LIBRARY}/${itemId}`;

    await spCrudOps.createFolder(DOCS_LIBRARY, `${itemId}`, props);

    for (const file of supportingFiles) {
      await spCrudOps.uploadFile(folderUrl, file, props);
    }
  };

  const handleSaveAsDraft = async (): Promise<void> => {
    if (!isRequestorValid) {
      Swal.fire({
        title: "Cannot Save",
        text: "Requestor details could not be loaded. Please contact your administrator.",
        icon: "error",
      });
      return;
    }

    setIsSaving(true);

    try {
      const requestNo = await changeRequestOps.generateRequestNo(props);

      const createResponse = await changeRequestOps.createChangeRequest(
        buildPayload(true, requestNo),
        props,
      );

      const newItemId = extractItemId(createResponse);

      if (newItemId) {
        await uploadSupportingFiles(newItemId);
      }

      Swal.fire({
        title: "Draft Saved",
        text: "Draft Saved Successfully.",
        icon: "success",
      }).then(() => {
        history.push("/Dashboard");
      });
    } catch (error) {
      console.error("Draft save error:", error);

      Swal.fire({
        title: "Error",
        text: "Failed to save draft.",
        icon: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!isRequestorValid) {
      Swal.fire({
        title: "Cannot Submit",
        text: "Requestor details could not be loaded. Please contact your administrator.",
        icon: "error",
      });
      return;
    }

    const {
      ProgramConfigurationChange,
      RequestType,
      ProgramName,
      Urgencyofrequest,
      Tcode,
      RequestDescriptionwithReason,
    } = changeRequestData;

    if (!ProgramConfigurationChange) {
      Swal.fire({
        title: "Validation",
        text: "Please Select Program Configuration Change.",
        icon: "warning",
      });
      return;
    }

    if (!RequestType) {
      Swal.fire({
        title: "Validation",
        text: "Please Select Request Type.",
        icon: "warning",
      });
      return;
    }

    if (!ProgramName) {
      Swal.fire({
        title: "Validation",
        text: "Please Enter Program Name.",
        icon: "warning",
      });
      return;
    }

    if (!Tcode) {
      Swal.fire({
        title: "Validation",
        text: "Please Enter TCode.",
        icon: "warning",
      });
      return;
    }

    if (!Urgencyofrequest) {
      Swal.fire({
        title: "Validation",
        text: "Please Select Urgency Of Request.",
        icon: "warning",
      });
      return;
    }

    if (!RequestDescriptionwithReason) {
      Swal.fire({
        title: "Validation",
        text: "Please Enter Request Description With Reason.",
        icon: "warning",
      });
      return;
    }

    setIsSaving(true);

    try {
      const requestNo = await changeRequestOps.generateRequestNo(props);

      const createResponse = await changeRequestOps.createChangeRequest(
        buildPayload(false, requestNo),
        props,
      );

      const newItemId = extractItemId(createResponse);

      if (newItemId) {
        await uploadSupportingFiles(newItemId);
      }

      Swal.fire({
        title: "Success",
        text: "Request Submitted Successfully.",
        icon: "success",
      }).then(() => {
        history.push("/Dashboard");
      });
    } catch (error) {
      console.error("Submit error:", error);

      Swal.fire({
        title: "Error",
        text: "Failed to submit change request.",
        icon: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const ReadOnlyField: React.FC<{ label: string; value?: string }> = ({
    label,
    value,
  }) => (
    <div className="requestor-field">
      <label>{label}</label>
      <input
        type="text"
        value={isLoading ? "Loading..." : value || ""}
        disabled
      />
    </div>
  );

  return (
    <section className="req-wrapper">
      <div className="req-main">
        <div className="req-header">
          <div className="header-left">
            <div className="company-logo">
              <img src={logoPrimary} alt="nbc Logo" />
            </div>
          </div>

          <div className="page-header">
            <h2 className="page-title">Change Request Form</h2>
          </div>

          <div className="header-right">
            <span className="user-name-new">{props.userDisplayName}</span>
            <div className="user-icon">
              <img src={userLogo} alt="User" />
            </div>
          </div>
        </div>

        <div className="req-body">
          {!isLoading && !isRequestorValid && (
            <div className="requestor-error-banner">
              Requestor details could not be found for your account. Contact
              your administrator before submitting a request.
            </div>
          )}

          <div className="approval-ribbon">
            <div className="ribbon-step current">
              {props.userDisplayName}
            </div>

            {approverDetails.map((approver, index) => (
              <div key={index} className="ribbon-step pending">
                {approver.Name}
              </div>
            ))}
          </div>

          <div className="form-container">
            <div className="section-heading">Requestor Details</div>

            <div className="requestor-grid">
              <ReadOnlyField
                label="Requested By"
                value={employeeData.EmployeeName}
              />
              <ReadOnlyField label="Email" value={employeeData.EmployeeEmail} />
              <ReadOnlyField
                label="Employee SAP Number/ID"
                value={employeeData.EmployeeSAPID}
              />
              <ReadOnlyField
                label="Department"
                value={employeeData.Department}
              />

              <ReadOnlyField label="Grade" value={employeeData.Grade} />
              <ReadOnlyField
                label="Cost Centre"
                value={employeeData.CostCentre}
              />
              <ReadOnlyField
                label="Contact No."
                value={employeeData.ContactNo}
              />

              <ReadOnlyField
                label="Reporting Manager"
                value={employeeData.ReportingManager}
              />
            </div>
          </div>

          <div className="form-container second-form">
            <div className="section-heading black-heading">
              Change Request Details
            </div>

            <div className="basic-po-grid">
              <div className="requestor-field">
                <label>
                  Program/Configuration Change
                  <span className="required">*</span>
                </label>
                <select
                  name="ProgramConfigurationChange"
                  value={changeRequestData.ProgramConfigurationChange}
                  onChange={handleChange}
                >
                  <option value="">Select</option>
                  <option value="Program Change">Program Change</option>
                  <option value="Configuration Change">
                    Configuration Change
                  </option>
                </select>
              </div>

              <div className="requestor-field">
                <label>
                  Request Type
                  <span className="required">*</span>
                </label>
                <select
                  name="RequestType"
                  value={changeRequestData.RequestType}
                  onChange={handleChange}
                >
                  <option value="">Select</option>
                  <option value="New Development">New Development</option>
                  <option value="Existing">Existing</option>
                </select>
              </div>

              <div className="requestor-field">
                <label>
                  Program Name
                  <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="ProgramName"
                  value={changeRequestData.ProgramName}
                  onChange={handleChange}
                  placeholder="Enter Program Name"
                />
              </div>

              <div className="requestor-field">
                <label>Tcode
                  <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="Tcode"
                  value={changeRequestData.Tcode}
                  onChange={handleChange}
                  placeholder="Enter Tcode"
                />
              </div>

              <div className="requestor-field">
                <label>
                  Urgency of Request
                  <span className="required">*</span>
                </label>
                <select
                  name="Urgencyofrequest"
                  value={changeRequestData.Urgencyofrequest}
                  onChange={handleChange}
                >
                  <option value="">Select</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Early">Early</option>
                  <option value="Normal">Normal</option>
                </select>
              </div>

              <div className="requestor-field">
                <label>
                  <span>
                    <FontAwesomeIcon icon={faPaperclip} /> Supporting Document
                  </span>
                </label>

                <div className="file-field">
                  <input type="file" multiple onChange={handleFileChange} />
                </div>

                <div className="attachments-dropdown">
                  <button
                    type="button"
                    className="attachments-toggle"
                    onClick={toggleAttachments}
                  >
                    <span>
                      {`${supportingFiles.length} Attachment${
                        supportingFiles.length === 1 ? "" : "s"
                      }`}
                    </span>
                    <FontAwesomeIcon
                      icon={isAttachmentsOpen ? faChevronUp : faChevronDown}
                    />
                  </button>

                  {isAttachmentsOpen && (
                    <div className="attachments-panel">
                      {supportingFiles.length === 0 ? (
                        <div className="attachments-empty">No attachments</div>
                      ) : (
                        <ul className="saved-files-list">
                          {supportingFiles.map((file) => (
                            <li key={file.name}>
                              <FontAwesomeIcon icon={faFileAlt} />
                              <span>{file.name}</span>
                              <FontAwesomeIcon
                                icon={faTimes}
                                className="remove-file-icon"
                                onClick={() => handleRemoveFile(file.name)}
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="requestor-field">
                <label>
                  Request Description with Reason
                  <span className="required">*</span>
                </label>
                <textarea
                  name="RequestDescriptionwithReason"
                  value={changeRequestData.RequestDescriptionwithReason}
                  onChange={handleChange}
                  placeholder="Enter Description and Reason"
                />
              </div>

              <div className="requestor-field">
                <label>Additional Information</label>
                <textarea
                  name="AdditionalInformation"
                  value={changeRequestData.AdditionalInformation}
                  onChange={handleChange}
                  placeholder="Enter Additional Information"
                />
              </div>

              <div className="requestor-field col-span-2">
                <label>Remarks</label>
                <textarea
                  className="remarks-textarea"
                  name="Remarks"
                  value={changeRequestData.Remarks}
                  onChange={handleChange}
                  placeholder="Enter Remarks"
                />
              </div>
            </div>
          </div>

          <div className="bottom-btn-wrapper">
            <button
              className="draft-btn"
              onClick={handleSaveAsDraft}
              disabled={isSaving || isLoading}
            >
              {isSaving ? "Saving..." : "Save as Draft"}
            </button>

            <button
              className="submit-btn-new"
              onClick={handleSubmit}
              disabled={isSaving || isLoading}
            >
              {isSaving ? "Submitting..." : "Submit"}
            </button>

            <button
              className="exit-btn"
              onClick={() => history.push("/Dashboard")}
              disabled={isSaving}
            >
              Exit
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewRequest;