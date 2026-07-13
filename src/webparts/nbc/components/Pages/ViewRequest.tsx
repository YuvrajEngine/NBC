import * as React from "react";
import { useHistory, useParams } from "react-router-dom";
import { faPaperclip, faFileAlt, faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { INbcProps } from "../INbcProps";
import logoPrimary from "../../assets/Images/NBC_LOGO.png";
import userLogo from "../../assets/Images/UserAvatar.png";
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
  EmployeeEmail: string;
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

const ViewRequest: React.FC<INbcProps> = (props) => {
  const history = useHistory();
  const { id } = useParams<{ id: string }>();

  const [isLoading, setIsLoading] = React.useState(false);
  const [isFilesLoading, setIsFilesLoading] = React.useState(false);
  const [requestData, setRequestData] = React.useState<IChangeRequestItem | null>(null);
  const [savedFiles, setSavedFiles] = React.useState<ISavedFile[]>([]);
  const [isAttachmentsOpen, setIsAttachmentsOpen] = React.useState(false);
  const [workflowHistory, setWorkflowHistory] = React.useState<IWorkflowHistoryItem[]>([]);

  const getRequestDetails = async (): Promise<void> => {
    setIsLoading(true);

    try {
      const spCrudOps = await SPCRUDOPS();

      const response = await spCrudOps.getItemData(
        CHANGE_REQUEST_LIST,
        Number(id),
        "Id,RequestNo,RequestedBy,ReportingManager,EmployeeSAPNumberID,EmployeeEmail,CostCentre,Department,Grade,ContactNumber,ProgramConfigurationChange,RequestType,RequestDescriptionwithReason,ProgramName,Tcode,Urgencyofrequest,AdditionalInformation,Remarks",
        "",
        props,
      );

      setRequestData(response || null);
    } catch (error) {
      console.error("View request fetch error:", error);
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

  const ReadOnlyField: React.FC<{ label: string; value?: string | number | null }> = ({
    label,
    value,
  }) => (
    <div className="requestor-field">
      <label>{label}</label>
      <input
        type="text"
        value={isLoading ? "Loading..." : value !== undefined && value !== null ? String(value) : ""}
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
            <h2 className="page-title">View Change Request</h2>
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
              <ReadOnlyField label="Requested By" value={requestData?.RequestedBy} />
              <ReadOnlyField label="Email" value={requestData?.EmployeeSAPNumberID} />
              <ReadOnlyField label="Employee Email" value={requestData?.EmployeeEmail} />
              <ReadOnlyField label="Department" value={requestData?.Department} />
              <ReadOnlyField label="Grade" value={requestData?.Grade} />
              <ReadOnlyField label="Cost Centre" value={requestData?.CostCentre} />
              <ReadOnlyField label="Contact No." value={requestData?.ContactNumber} />

              <ReadOnlyField label="Reporting Manager" value={requestData?.ReportingManager} />
            </div>
          </div>

          <div className="form-container second-form">
            <div className="section-heading black-heading">Change Request Details</div>
            <div className="basic-po-grid">
              <ReadOnlyField
                label="Program/Configuration Change"
                value={requestData?.ProgramConfigurationChange}
              />
              <ReadOnlyField label="Request Type" value={requestData?.RequestType} />
              <ReadOnlyField label="Program Name" value={requestData?.ProgramName} />
              <ReadOnlyField label="Tcode" value={requestData?.Tcode} />
              <ReadOnlyField label="Urgency of Request" value={requestData?.Urgencyofrequest} />
              <div className="requestor-field">
                <label>
                  <span>
                    <FontAwesomeIcon icon={faPaperclip} /> Supporting Document
                  </span>
                </label>

                <div className="attachments-dropdown">
                  <button
                    type="button"
                    className="attachments-toggle"
                    onClick={toggleAttachments}
                  >
                    <span>
                      {isFilesLoading
                        ? "Loading..."
                        : `${savedFiles.length} Attachment${savedFiles.length === 1 ? "" : "s"}`}
                    </span>
                    <FontAwesomeIcon icon={isAttachmentsOpen ? faChevronUp : faChevronDown} />
                  </button>

                  {isAttachmentsOpen && (
                    <div className="attachments-panel">
                      {isFilesLoading ? (
                        <div className="attachments-empty">Loading...</div>
                      ) : savedFiles.length === 0 ? (
                        <div className="attachments-empty">No attachments</div>
                      ) : (
                        <ul className="saved-files-list">
                          {savedFiles.map((file) => (
                            <li key={file.url}>
                              <FontAwesomeIcon icon={faFileAlt} />
                              <a href={file.url} target="_blank" rel="noopener noreferrer">
                                {file.name}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="requestor-field">
                <label>Request Description with Reason</label>
                <textarea
                  value={isLoading ? "Loading..." : requestData?.RequestDescriptionwithReason || ""}
                  disabled
                />
              </div>

              <div className="requestor-field">
                <label>Additional Information</label>
                <textarea
                  value={isLoading ? "Loading..." : requestData?.AdditionalInformation || ""}
                  disabled
                />
              </div>

              <div className="requestor-field col-span-2">
                <label>Remarks</label>
                <textarea
                  className="remarks-textarea"
                  value={isLoading ? "Loading..." : requestData?.Remarks || ""}
                  disabled
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
            <button className="exit-btn" onClick={() => history.push("/Dashboard")}>
              Exit
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ViewRequest;