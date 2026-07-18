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
import EmployeeMasterOps from "../../services/BAL/EmployeeMaster";
import SPCRUDOPS from "../../services/DAL/spcrudops";
import "./CSS/NewRequest.scss";

const CHANGE_REQUEST_LIST = "ChangeRequest";
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

type RibbonState = "approved" | "current" | "rejected" | "pending";

const ApprovalForm: React.FC<INbcProps> = (props) => {
  const history = useHistory();
  const { id } = useParams<{ id: string }>();

  const changeRequestOps = React.useMemo(() => ChangeRequestOps(), []);

  const [isLoading, setIsLoading] = React.useState(false);
  const [isFilesLoading, setIsFilesLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [requestData, setRequestData] =
    React.useState<IChangeRequestItem | null>(null);
  const [approverDetails, setApproverDetails] = React.useState<
    IApproverDetails[]
  >([]);
  const [effectiveCurrentApproverId, setEffectiveCurrentApproverId] =
    React.useState<number | null>(null);
  const [savedFiles, setSavedFiles] = React.useState<ISavedFile[]>([]);
  const [isAttachmentsOpen, setIsAttachmentsOpen] = React.useState(false);
  const [workflowHistory, setWorkflowHistory] = React.useState<
    IWorkflowHistoryItem[]
  >([]);
  const [approverRemarks, setApproverRemarks] = React.useState("");

  const currentUserId = props.currentSPContext?.pageContext?.legacyPageContext
    ?.userId as number | undefined;

  const parseApprovalMatrix = (raw: string | undefined | null): IApproverDetails[] => {
    try {
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const getApproverRibbonStates = (
    approvers: IApproverDetails[],
    currentApproverId: number | null,
  ): RibbonState[] => {
    if (approvers.length === 0) return [];

    const normalize = (s?: string): string => (s || "").trim().toLowerCase();

    const rejectedIndex = approvers.findIndex(
      (a) => normalize(a.status) === "reject" || normalize(a.status) === "rejected",
    );

    if (rejectedIndex !== -1) {
      return approvers.map((_, index) => {
        if (index < rejectedIndex) return "approved";
        if (index === rejectedIndex) return "rejected";
        return "pending";
      });
    }

    let currentIndex = approvers.findIndex(
      (a) => currentApproverId != null && Number(a.Id) === Number(currentApproverId),
    );

    if (currentIndex === -1) {
      currentIndex = approvers.findIndex((a) => normalize(a.status) === "pending");
    }

    if (currentIndex !== -1) {
      return approvers.map((_, index) => {
        if (index < currentIndex) return "approved";
        if (index === currentIndex) return "current";
        return "pending";
      });
    }

    const allApproved = approvers.every((a) => normalize(a.status) === "approved");

    return approvers.map(() => (allApproved ? "approved" : "pending"));
  };

  const getRibbonStepClass = (state: RibbonState): string => {
    if (state === "approved") return "approved";
    if (state === "rejected") return "rejected";
    if (state === "current") return "current";
    return "pending";
  };

  const buildApprovalFlowFallback = async (
    employeeEmail: string,
    fallbackRMName: string,
  ): Promise<IApproverDetails[]> => {
    try {
      const employeeMasterOps = EmployeeMasterOps();
      const sp = await SPCRUDOPS();

      const empResponse = await employeeMasterOps.getEmployeeMasterData(
        `EmployeeEmail eq '${employeeEmail}'`,
        "",
        props,
      );

      const emp = empResponse?.[0];
      const baseApprovers: IApproverDetails[] = [];

      if (emp?.ReportingManagerId) {
        baseApprovers.push({
          Id: emp.ReportingManagerId,
          Name: emp.ReportingManager || fallbackRMName,
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

      return fullFlow;
    } catch (error) {
      console.error("Error building fallback approval flow:", error);
      return [];
    }
  };

  const getRequestDetails = async (): Promise<void> => {
    setIsLoading(true);

    try {
      const spCrudOps = await SPCRUDOPS();

      const response = await spCrudOps.getItemData(
        CHANGE_REQUEST_LIST,
        Number(id),
        "Id,RequestNo,RequestedBy,ReportingManager,EmployeeSAPNumberID,EmployeeEmail,CostCentre,Department,Grade,ContactNumber,ProgramConfigurationChange,RequestType,RequestDescriptionwithReason,ProgramName,Tcode,Urgencyofrequest,AdditionalInformation,Remarks,WorkflowHistory,ApprovalMatrix,CurrentApproverId,ApproverRemarks,Status",
        "",
        props,
      );

      setRequestData(response || null);

      try {
        setWorkflowHistory(
          response?.WorkflowHistory ? JSON.parse(response.WorkflowHistory) : [],
        );
      } catch {
        setWorkflowHistory([]);
      }

      const parsedApprovers = parseApprovalMatrix(response?.ApprovalMatrix);

      if (parsedApprovers.length > 0) {
        setApproverDetails(parsedApprovers);
        setEffectiveCurrentApproverId(response?.CurrentApproverId ?? null);
      } else if (response) {
        const fallbackApprovers = await buildApprovalFlowFallback(
          response.EmployeeEmail,
          response.ReportingManager,
        );

        setApproverDetails(fallbackApprovers);
        setEffectiveCurrentApproverId(
          response?.CurrentApproverId ?? fallbackApprovers[0]?.Id ?? null,
        );
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

  const ribbonStates = React.useMemo(
    () => getApproverRibbonStates(approverDetails, effectiveCurrentApproverId),
    [approverDetails, effectiveCurrentApproverId],
  );

  const advanceApproval = (
    action: "Approved" | "Reject",
    comment: string,
  ) => {
    const approverList = approverDetails.map((approver) => ({ ...approver }));

    let currentIndex = approverList.findIndex(
      (a) => Number(a.Id) === Number(effectiveCurrentApproverId),
    );

    if (currentIndex === -1 && currentUserId) {
      currentIndex = approverList.findIndex(
        (a) =>
          Number(a.Id) === Number(currentUserId) && a.status === "Pending",
      );
    }

    if (currentIndex === -1) {
      return null;
    }

    let nextApproverId: number | null = null;
    let newStatus = requestData?.Status || "";

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
      newStatus = "Reject";
    }

    const updatedHistory = [
      ...workflowHistory,
      {
        CurrentApprover: approverList[currentIndex].Name,
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

      if (!payload) {
        Swal.fire({
          title: "Error",
          text: "Could not match you to the current approval step. Please refresh and try again, or contact your administrator.",
          icon: "error",
        });
        return;
      }

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
      const payload = advanceApproval("Reject", approverRemarks);

      if (!payload) {
        Swal.fire({
          title: "Error",
          text: "Could not match you to the current approval step. Please refresh and try again, or contact your administrator.",
          icon: "error",
        });
        return;
      }

      await changeRequestOps.updateChangeRequest(
        requestData.Id as number,
        payload,
        props,
      );

      Swal.fire({
        title: "Rejected",
        text: "Request Rejected Successfully.",
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
      title: "Sent Back Request?",
      text: `Sent ${requestData.RequestNo} back to the requestor?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sent Back",
    });

    if (!confirmResult.isConfirmed) {
      return;
    }

    setIsSaving(true);

    try {
      const resetMatrix = approverDetails.map((approver, index) => ({
        ...approver,
        status: index === 0 ? "Pending" : "",
      }));

      const rmApproverId = resetMatrix.length > 0 ? resetMatrix[0].Id : null;

      const updatedHistory = [
        ...workflowHistory,
        {
          CurrentApprover: props.userDisplayName,
          ActionTaken: "Sent Back",
          Comment: approverRemarks,
          Date: new Date().toISOString(),
          CurrentStatus: "Sent Back",
        },
      ];

      await changeRequestOps.updateChangeRequest(
        requestData.Id as number,
        {
          Status: "Sent Back",
          CurrentApproverId: rmApproverId,
          ApprovalMatrix: JSON.stringify(resetMatrix),
          WorkflowHistory: JSON.stringify(updatedHistory),
          ApproverRemarks: approverRemarks,
        },
        props,
      );

      Swal.fire({
        title: "Sent Back",
        text: "Request Sent Back to the Requestor.",
        icon: "success",
      }).then(() => {
        history.push("/ApprovalDashboard");
      });
    } catch (error) {
      console.error("Sent Back error:", error);

      Swal.fire({
        title: "Error",
        text: "Failed to Sent Back the request.",
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
          <div className="approval-ribbon">
            <div className="ribbon-step initiator">
              {requestData?.RequestedBy}
            </div>

            {approverDetails.map((approver, index) => (
              <div
                key={index}
                className={`ribbon-step ${getRibbonStepClass(ribbonStates[index])}`}
              >
                {approver.Name}
              </div>
            ))}
          </div>

          <div className="form-container">
            <div className="section-heading">Requestor Details</div>

            <div className="requestor-grid">
              <ReadOnlyField
                label="Requested By"
                value={requestData?.RequestedBy}
              />
              <ReadOnlyField
                label="Email"
                value={requestData?.EmployeeEmail}
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
              {isSaving ? "Processing..." : "Sent Back"}
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