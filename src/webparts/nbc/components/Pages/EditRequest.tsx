import * as React from "react";
import { useHistory, useParams } from "react-router-dom";
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
import ChangeRequestOps, {
  IChangeRequestPayload,
} from "../../services/BAL/ChangeRequestMaster";
import SPCRUDOPS from "../../services/DAL/spcrudops";
import "./CSS/NewRequest.scss";

const CHANGE_REQUEST_LIST = "ChangeRequest";
const DOCS_LIBRARY = "NBCDocs";

interface IChangeRequestItem {
  Id: number;
  RequestNo: string;
  RequestedBy: string;
  ReportingManager: string;
  EmployeeSAPNumberID: string;
  CostCentre: string;
  Department: string;
  Grade: string;
  ContactNumber: number | null;
  ProgramConfigurationChange: string;
  RequestType: string;
  RequestDescriptionwithReason: string;
  ProgramName: string;
  Tcode: string;
  Urgencyofrequest: string;
  AdditionalInformation: string;
  Remarks: string;
}

interface ISavedFile {
  name: string;
  url: string;
}

interface IWorkflowHistoryItem {
  CurrentApprover?: string;
  ActionBy?: string;
  ActionTaken?: string;
  Action?: string;
  Date?: string;
  ActionDate?: string;
  Comment?: string;
  Remarks?: string;
}

const EditRequest: React.FC<INbcProps> = (props) => {
  const history = useHistory();
  const { id } = useParams<{ id: string }>();

  const changeRequestOps = React.useMemo(() => ChangeRequestOps(), []);

  const [isLoading, setIsLoading] = React.useState(false);
  const [isFilesLoading, setIsFilesLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [requestData, setRequestData] =
    React.useState<IChangeRequestItem | null>(null);
  const [savedFiles, setSavedFiles] = React.useState<ISavedFile[]>([]);
  const [newFiles, setNewFiles] = React.useState<File[]>([]);
  const [isAttachmentsOpen, setIsAttachmentsOpen] = React.useState(false);
  const [workflowHistory, setWorkflowHistory] = React.useState<
    IWorkflowHistoryItem[]
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

  const getRequestDetails = async (): Promise<void> => {
    setIsLoading(true);

    try {
      const spCrudOps = await SPCRUDOPS();

      const response = await spCrudOps.getItemData(
        CHANGE_REQUEST_LIST,
        Number(id),
        "Id,RequestNo,RequestedBy,ReportingManager,EmployeeSAPNumberID,CostCentre,Department,Grade,ContactNumber,ProgramConfigurationChange,RequestType,RequestDescriptionwithReason,ProgramName,Tcode,Urgencyofrequest,AdditionalInformation,Remarks",
        "",
        props,
      );

      if (response) {
        setRequestData(response);

        setChangeRequestData({
          ProgramConfigurationChange: response.ProgramConfigurationChange || "",
          RequestType: response.RequestType || "",
          ProgramName: response.ProgramName || "",
          Tcode: response.Tcode || "",
          Urgencyofrequest: response.Urgencyofrequest || "",
          RequestDescriptionwithReason:
            response.RequestDescriptionwithReason || "",
          AdditionalInformation: response.AdditionalInformation || "",
          Remarks: response.Remarks || "",
        });
      } else {
        setRequestData(null);
      }
    } catch (error) {
      console.error("Edit request fetch error:", error);

      Swal.fire({
        title: "Error",
        text: "Failed to load change request details.",
        icon: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSavedFiles = async (): Promise<void> => {
    setIsFilesLoading(true);

    try {
      const webUrl = props.currentSPContext.pageContext.web.absoluteUrl;
      const webServerRelativeUrl = new URL(webUrl).pathname;
      const folderUrl = `${webServerRelativeUrl}/${DOCS_LIBRARY}/${id}`;

      const response = await fetch(
        `${webUrl}/_api/web/GetFolderByServerRelativeUrl('${encodeURIComponent(folderUrl)}')/Files`,
        {
          method: "GET",
          headers: {
            Accept: "application/json;odata=verbose",
          },
          credentials: "same-origin",
        },
      );

      if (response.ok) {
        const data = await response.json();
        const files = data?.d?.results || [];

        setSavedFiles(
          files.map((file: any) => ({
            name: file.Name,
            url: file.ServerRelativeUrl,
          })),
        );
      } else {
        setSavedFiles([]);
      }
    } catch (error) {
      console.error("Saved files fetch error:", error);
      setSavedFiles([]);
    } finally {
      setIsFilesLoading(false);
    }
  };

  React.useEffect(() => {
    if (id) {
      getRequestDetails();
      getSavedFiles();
    }
  }, [id]);

  const toggleAttachments = (): void => setIsAttachmentsOpen((prev) => !prev);

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
      setNewFiles((prev) => [
        ...prev,
        ...Array.from(e.target.files as FileList),
      ]);
    }
  };

  const handleRemoveNewFile = (fileName: string): void => {
    setNewFiles((prev) => prev.filter((file) => file.name !== fileName));
  };

  const handleDeleteSavedFile = async (file: ISavedFile): Promise<void> => {
    const confirmResult = await Swal.fire({
      title: "Delete Attachment",
      text: `Are you sure you want to delete "${file.name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    });

    if (!confirmResult.isConfirmed) {
      return;
    }

    try {
      const webUrl = props.currentSPContext.pageContext.web.absoluteUrl;

      const digestResponse = await fetch(`${webUrl}/_api/contextinfo`, {
        method: "POST",
        headers: {
          Accept: "application/json;odata=verbose",
        },
        credentials: "same-origin",
      });

      if (!digestResponse.ok) {
        Swal.fire({
          title: "Error",
          text: "Failed to authorize the delete request.",
          icon: "error",
        });
        return;
      }

      const digestData = await digestResponse.json();
      const requestDigest =
        digestData?.d?.GetContextWebInformation?.FormDigestValue;

      const response = await fetch(
        `${webUrl}/_api/web/GetFileByServerRelativeUrl('${encodeURIComponent(file.url)}')`,
        {
          method: "POST",
          headers: {
            Accept: "application/json;odata=verbose",
            "X-HTTP-Method": "DELETE",
            "IF-MATCH": "*",
            "X-RequestDigest": requestDigest,
          },
          credentials: "same-origin",
        },
      );

      if (response.ok) {
        setSavedFiles((prev) => prev.filter((f) => f.url !== file.url));
      } else {
        Swal.fire({
          title: "Error",
          text: "Failed to delete the attachment.",
          icon: "error",
        });
      }
    } catch (error) {
      console.error("Delete attachment error:", error);

      Swal.fire({
        title: "Error",
        text: "Failed to delete the attachment.",
        icon: "error",
      });
    }
  };

  const buildPayload = (isDraft: boolean): IChangeRequestPayload => ({
    Title: "",
    RequestNo: requestData?.RequestNo || "",
    RequestedBy: requestData?.RequestedBy || "",
    ReportingManager: requestData?.ReportingManager || "",
    EmployeeSAPNumberID: requestData?.EmployeeSAPNumberID || "",
    CostCentre: requestData?.CostCentre || "",
    Department: requestData?.Department || "",
    Grade: requestData?.Grade || "",
    ContactNumber: requestData?.ContactNumber ?? null,
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
  });

  const folderExists = async (folderUrl: string): Promise<boolean> => {
    try {
      const webUrl = props.currentSPContext.pageContext.web.absoluteUrl;

      const response = await fetch(
        `${webUrl}/_api/web/GetFolderByServerRelativeUrl('${encodeURIComponent(folderUrl)}')`,
        {
          method: "GET",
          headers: {
            Accept: "application/json;odata=verbose",
          },
          credentials: "same-origin",
        },
      );

      return response.ok;
    } catch (error) {
      return false;
    }
  };

  const uploadNewFiles = async (): Promise<void> => {
    if (newFiles.length === 0) {
      return;
    }

    const spCrudOps = await SPCRUDOPS();

    const webServerRelativeUrl = new URL(
      props.currentSPContext.pageContext.web.absoluteUrl,
    ).pathname;

    const folderUrl = `${webServerRelativeUrl}/${DOCS_LIBRARY}/${id}`;

    const alreadyExists = await folderExists(folderUrl);

    if (!alreadyExists) {
      await spCrudOps.createFolder(DOCS_LIBRARY, `${id}`, props);
    }

    for (const file of newFiles) {
      await spCrudOps.uploadFile(folderUrl, file, props);
    }
  };

  const handleSaveAsDraft = async (): Promise<void> => {
    setIsSaving(true);

    try {
      await changeRequestOps.updateChangeRequest(
        Number(id),
        buildPayload(true),
        props,
      );

      await uploadNewFiles();

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

    if (!Tcode) {
      Swal.fire({
        title: "Validation",
        text: "Please Enter TCode.",
        icon: "warning",
      });
      return;
    }
    setIsSaving(true);

    try {
      await changeRequestOps.updateChangeRequest(
        Number(id),
        buildPayload(false),
        props,
      );

      await uploadNewFiles();

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
        text: "Failed to update change request.",
        icon: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const ReadOnlyField: React.FC<{
    label: string;
    value?: string | number | null;
  }> = ({ label, value }) => (
    <div className="requestor-field">
      <label>{label}</label>
      <input
        type="text"
        value={
          isLoading
            ? "Loading..."
            : value !== undefined && value !== null
              ? String(value)
              : ""
        }
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
            <h2 className="page-title">Edit Change Request</h2>
          </div>

          <div className="header-right">
            <span className="user-name-new">{props.userDisplayName}</span>
            <div className="user-icon">
              <img src={userLogo} alt="User" />
            </div>
          </div>
        </div>

        <div className="req-body">
          <div className="form-container">
            <div className="section-heading">Requestor Details</div>

            <div className="requestor-grid">
              <ReadOnlyField
                label="Request No"
                value={requestData?.RequestNo}
              />
              <ReadOnlyField
                label="Requested By"
                value={requestData?.RequestedBy}
              />
              <ReadOnlyField
                label="Employee SAP Number/ID"
                value={requestData?.EmployeeSAPNumberID}
              />
              <ReadOnlyField
                label="Department"
                value={requestData?.Department}
              />

              <ReadOnlyField label="Grade" value={requestData?.Grade} />
              <ReadOnlyField
                label="Cost Centre"
                value={requestData?.CostCentre}
              />
              <ReadOnlyField
                label="Contact No."
                value={requestData?.ContactNumber}
              />

              <ReadOnlyField
                label="Reporting Manager"
                value={requestData?.ReportingManager}
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
                      {isFilesLoading
                        ? "Loading..."
                        : `${savedFiles.length + newFiles.length} Attachment${
                            savedFiles.length + newFiles.length === 1 ? "" : "s"
                          }`}
                    </span>
                    <FontAwesomeIcon
                      icon={isAttachmentsOpen ? faChevronUp : faChevronDown}
                    />
                  </button>

                  {isAttachmentsOpen && (
                    <div className="attachments-panel">
                      {isFilesLoading ? (
                        <div className="attachments-empty">Loading...</div>
                      ) : savedFiles.length === 0 && newFiles.length === 0 ? (
                        <div className="attachments-empty">No attachments</div>
                      ) : (
                        <ul className="saved-files-list">
                          {savedFiles.map((file) => (
                            <li key={file.url}>
                              <FontAwesomeIcon icon={faFileAlt} />
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {file.name}
                              </a>
                              <FontAwesomeIcon
                                icon={faTimes}
                                className="remove-file-icon"
                                onClick={() => handleDeleteSavedFile(file)}
                              />
                            </li>
                          ))}
                          {newFiles.map((file) => (
                            <li key={file.name}>
                              <FontAwesomeIcon icon={faFileAlt} />
                              <span>{file.name}</span>
                              <FontAwesomeIcon
                                icon={faTimes}
                                className="remove-file-icon"
                                onClick={() => handleRemoveNewFile(file.name)}
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

          <div className="workflow-history-container">
            <div className="workflow-heading">Workflow History</div>
            <div className="workflow-table-wrapper workflow-scroll">
              <table className="workflow-table">
                <thead>
                  <tr>
                    <th>Action By</th>
                    <th>Action Taken</th>
                    <th>Date</th>
                    <th>Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {workflowHistory.length > 0 ? (
                    workflowHistory.map((item, index) => (
                      <tr key={index}>
                        <td>{item.CurrentApprover || item.ActionBy || "-"}</td>
                        <td>{item.ActionTaken || item.Action || "-"}</td>
                        <td>
                          {item.Date || item.ActionDate
                            ? new Date(item.Date || item.ActionDate || "").toLocaleString("en-GB")
                            : "-"}
                        </td>
                        <td>{item.Comment || item.Remarks || "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="no-history">No Workflow History Available</td>
                    </tr>
                  )}
                </tbody>
              </table>
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
              {isSaving ? "Updating..." : "Submit"}
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

export default EditRequest;