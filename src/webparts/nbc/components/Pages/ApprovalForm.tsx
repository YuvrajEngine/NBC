import * as React from "react";
import { useHistory, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import {
  faPaperclip,
  faFileAlt,
  faChevronDown,
  faChevronUp,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { INbcProps } from "../INbcProps";
import logoPrimary from "../../assets/Images/NBC_LOGO.png";
import userLogo from "../../assets/Images/UserAvatar.png";
import ChangeRequestOps, {
  IChangeRequestItem,
} from "../../services/BAL/ChangeRequestMaster";
import "./CSS/NewRequest.scss";

const DOCS_LIBRARY = "NBCDocs";

interface ISavedFile {
  name: string;
  url: string;
}

interface IApproverDetails {
  Id: number;
  Name: string;
  Role: string;
  Level: number;
  status: string;
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
  CurrentStatus?: string;
}

const ApprovalForm: React.FC<INbcProps> = (props) => {
  const history = useHistory();
  const { id } = useParams<{ id: string }>();

  const changeRequestOps = React.useMemo(() => ChangeRequestOps(), []);

  const [isLoading, setIsLoading] = React.useState(false);
  const [isFilesLoading, setIsFilesLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [requestData, setRequestData] =
    React.useState<IChangeRequestItem | null>(null);
  const [savedFiles, setSavedFiles] = React.useState<ISavedFile[]>([]);
  const [isAttachmentsOpen, setIsAttachmentsOpen] = React.useState(false);
  const [workflowHistory, setWorkflowHistory] = React.useState<
    IWorkflowHistoryItem[]
  >([]);
  const [approverRemarks, setApproverRemarks] = React.useState("");

  const currentUserId = props.currentSPContext?.pageContext?.legacyPageContext
    ?.userId as number | undefined;

  const parseApprovalMatrix = (
    item: IChangeRequestItem | null,
  ): IApproverDetails[] => {
    try {
      return item?.ApprovalMatrix ? JSON.parse(item.ApprovalMatrix) : [];
    } catch {
      return [];
    }
  };

  const getRequestDetails = async (): Promise<void> => {
    setIsLoading(true);

    try {
      const response = await changeRequestOps.getChangeRequestById(
        Number(id),
        props,
      );

      setRequestData(response);

      try {
        setWorkflowHistory(
          response?.WorkflowHistory ? JSON.parse(response.WorkflowHistory) : [],
        );
      } catch {
        setWorkflowHistory([]);
      }
    } catch (error) {
      console.error("Approval form fetch error:", error);

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

  const advanceApproval = (
    action: "Approved" | "Rejected",
    comment: string,
  ) => {
    const approverList = parseApprovalMatrix(requestData);
    const currentIndex = approverList.findIndex(
      (a) => a.Id === requestData?.CurrentApproverId,
    );

    let nextApproverId: number | null = null;
    let newStatus = requestData?.Status || "";

    if (currentIndex !== -1) {
      approverList[currentIndex].status = action;

      if (action === "Approved") {
        const nextApprover = approverList[currentIndex + 1];

        if (nextApprover) {
          nextApprover.status = "Pending";
          nextApproverId = nextApprover.Id;
          newStatus = "Pending for Approval";
        } else {
          newStatus = "Approved";
        }
      } else {
        newStatus = "Rejected";
      }
    }

    const updatedHistory = [
      ...workflowHistory,
      {
        CurrentApprover: requestData?.CurrentApprover,
        ActionTaken: action,
        Comment: comment,
        Date: new Date().toISOString(),
        CurrentStatus: newStatus,
      },
    ];

    return {
      Status: newStatus,
      CurrentApproverId: nextApproverId,
      ApprovalMatrix: JSON.stringify(approverList),
      WorkflowHistory: JSON.stringify(updatedHistory),
      ApproverRemarks: comment || requestData?.ApproverRemarks || "",
    };
  };

  const handleApprove = async (): Promise<void> => {
    if (!requestData) {
      return;
    }

    if (!approverRemarks.trim()) {
      Swal.fire({
        title: "Validation",
        text: "Remarks Required.",
        icon: "warning",
      });
      return;
    }

    const confirmResult = await Swal.fire({
      title: "Approve Request?",
      text: `Approve ${requestData.RequestNo}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Approve",
    });

    if (!confirmResult.isConfirmed) {
      return;
    }

    setIsSaving(true);

    try {
      const payload = advanceApproval("Approved", approverRemarks);

      await changeRequestOps.updateChangeRequest(
        requestData.Id as number,
        payload,
        props,
      );

      Swal.fire({
        title: "Approved",
        text: "Request approved successfully.",
        icon: "success",
      }).then(() => {
        history.push("/ApprovalDashboard");
      });
    } catch (error) {
      console.error("Approve error:", error);

      Swal.fire({
        title: "Error",
        text: "Failed to approve request.",
        icon: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReject = async (): Promise<void> => {
    if (!requestData) {
      return;
    }

    if (!approverRemarks.trim()) {
      Swal.fire({
        title: "Validation",
        text: "Remarks Required.",
        icon: "warning",
      });
      return;
    }

    const confirmResult = await Swal.fire({
      title: "Reject Request?",
      text: `Reject ${requestData.RequestNo}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Reject",
    });

    if (!confirmResult.isConfirmed) {
      return;
    }

    setIsSaving(true);

    try {
      const payload = advanceApproval("Rejected", approverRemarks);

      await changeRequestOps.updateChangeRequest(
        requestData.Id as number,
        payload,
        props,
      );

      Swal.fire({
        title: "Rejected",
        text: "Request rejected.",
        icon: "success",
      }).then(() => {
        history.push("/ApprovalDashboard");
      });
    } catch (error) {
      console.error("Reject error:", error);

      Swal.fire({
        title: "Error",
        text: "Failed to reject request.",
        icon: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendBack = async (): Promise<void> => {
    if (!requestData) {
      return;
    }

    if (!approverRemarks.trim()) {
      Swal.fire({
        title: "Validation",
        text: "Remarks Required.",
        icon: "warning",
      });
      return;
    }

    const confirmResult = await Swal.fire({
      title: "Send Back Request?",
      text: `Send ${requestData.RequestNo} back to the requestor?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Send Back",
    });

    if (!confirmResult.isConfirmed) {
      return;
    }

    setIsSaving(true);

    try {
      const approverList = parseApprovalMatrix(requestData);
      const currentIndex = approverList.findIndex(
        (a) => a.Id === requestData.CurrentApproverId,
      );

      if (currentIndex !== -1) {
        approverList[currentIndex].status = "Sent Back";
      }

      const updatedHistory = [
        ...workflowHistory,
        {
          CurrentApprover: requestData.CurrentApprover,
          ActionTaken: "Sent Back",
          Comment: approverRemarks,
          Date: new Date().toISOString(),
          CurrentStatus: "Sent Back to Requestor",
        },
      ];

      await changeRequestOps.updateChangeRequest(
        requestData.Id as number,
        {
          Status: "Sent Back to Requestor",
          CurrentApproverId: null,
          ApprovalMatrix: JSON.stringify(approverList),
          WorkflowHistory: JSON.stringify(updatedHistory),
          ApproverRemarks: approverRemarks,
        },
        props,
      );

      Swal.fire({
        title: "Sent Back",
        text: "Request sent back to the requestor.",
        icon: "success",
      }).then(() => {
        history.push("/ApprovalDashboard");
      });
    } catch (error) {
      console.error("Send back error:", error);

      Swal.fire({
        title: "Error",
        text: "Failed to send back the request.",
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
            <h2 className="page-title">Approval Form</h2>
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
                label="Requested By"
                value={requestData?.RequestedBy}
              />
              <ReadOnlyField
                label="Email"
                value={requestData?.EmployeeSAPNumberID}
              />
              <ReadOnlyField
                label="Employee Email"
                value={requestData?.EmployeeEmail}
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
              <ReadOnlyField
                label="Program/Configuration Change"
                value={requestData?.ProgramConfigurationChange}
              />
              <ReadOnlyField
                label="Request Type"
                value={requestData?.RequestType}
              />
              <ReadOnlyField
                label="Program Name"
                value={requestData?.ProgramName}
              />
              <ReadOnlyField label="Tcode" value={requestData?.Tcode} />
              <ReadOnlyField
                label="Urgency of Request"
                value={requestData?.Urgencyofrequest}
              />
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
                    <FontAwesomeIcon
                      icon={isAttachmentsOpen ? faChevronUp : faChevronDown}
                    />
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
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
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
                  value={
                    isLoading
                      ? "Loading..."
                      : requestData?.RequestDescriptionwithReason || ""
                  }
                  disabled
                />
              </div>

              <div className="requestor-field">
                <label>Additional Information</label>
                <textarea
                  value={
                    isLoading
                      ? "Loading..."
                      : requestData?.AdditionalInformation || ""
                  }
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

              <div className="requestor-field col-span-2">
                <label>
                  Approver Remarks
                  <span className="required">*</span>
                </label>
                <textarea
                  className="remarks-textarea approver-remarks-textarea"
                  value={approverRemarks}
                  onChange={(e) => setApproverRemarks(e.target.value)}
                  placeholder="Enter your remarks"
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
                            ? new Date(
                                item.Date || item.ActionDate || "",
                              ).toLocaleString("en-GB")
                            : "-"}
                        </td>
                        <td>{item.Comment || item.Remarks || "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="no-history">
                        No Workflow History Available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bottom-btn-wrapper">
            <button
              className="submit-btn-new"
              onClick={handleApprove}
              disabled={isSaving || isLoading}
            >
              {isSaving ? "Processing..." : "Approve"}
            </button>

            <button
              className="reject-btn-new"
              onClick={handleReject}
              disabled={isSaving || isLoading}
            >
              {isSaving ? "Processing..." : "Reject"}
            </button>

            <button
              className="sendback-btn"
              onClick={handleSendBack}
              disabled={isSaving || isLoading}
            >
              {isSaving ? "Processing..." : "Send Back"}
            </button>

            <button
              className="ap-exit-btn"
              onClick={() => history.push("/ApprovalDashboard")}
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

export default ApprovalForm;
