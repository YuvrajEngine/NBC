import * as React from "react";
import { useHistory } from "react-router-dom";
import type { INbcProps } from "../INbcProps";
import {
  faBars,
  faEye,
  faPenSquare,
  faChevronDown,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import logoPrimary from "../../assets/Images/NBC_LOGO.png";
import logoSecondary from "../../assets/Images/CKA_LOGO.png";
import userLogo from "../../assets/Images/UserAvatar.png";
import ChangeRequestOps, {
  IChangeRequestItem,
} from "../../services/BAL/ChangeRequestMaster";

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

type ApprovalTab = "Pending Request" | "Approved" | "Rejected";

const ApprovalDashboard: React.FC<INbcProps> = (props) => {
  const history = useHistory();
  const changeRequestOps = React.useMemo(() => ChangeRequestOps(), []);
  const [expandedMenu, setExpandedMenu] = React.useState<string | null>(
    "approverDashboard",
  );

  const [activeTab, setActiveTab] =
    React.useState<ApprovalTab>("Pending Request");
  const [isLoading, setIsLoading] = React.useState(false);
  const [dashboardData, setDashboardData] = React.useState<
    IChangeRequestItem[]
  >([]);
  const [filteredDashboardData, setFilteredDashboardData] = React.useState<
    IChangeRequestItem[]
  >([]);
  const [searchText, setSearchText] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  const currentUserId = props.currentSPContext?.pageContext?.legacyPageContext
    ?.userId as number | undefined;

  const toggleMenu = (menu: string): void => {
    setExpandedMenu((prev) => (prev === menu ? null : menu));
  };

  const parseApprovalMatrix = (
    item: IChangeRequestItem,
  ): IApproverDetails[] => {
    try {
      return item.ApprovalMatrix ? JSON.parse(item.ApprovalMatrix) : [];
    } catch {
      return [];
    }
  };

  const parseWorkflowHistory = (
    item: IChangeRequestItem,
  ): IWorkflowHistoryItem[] => {
    try {
      const raw = (item as unknown as { WorkflowHistory?: string })
        .WorkflowHistory;
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const userTookAction = (
    item: IChangeRequestItem,
    action: "Approved" | "Reject",
  ): boolean => {
    const matchPrefix = action === "Approved" ? "approv" : "reject";

    const matrixHit =
      currentUserId != null &&
      parseApprovalMatrix(item).some((entry) => {
        if (Number(entry.Id) !== Number(currentUserId)) {
          return false;
        }

        const status = entry.status?.trim().toLowerCase() || "";
        return status.startsWith(matchPrefix);
      });

    if (matrixHit) {
      return true;
    }

    const displayName = props.userDisplayName?.trim().toLowerCase() || "";

    if (!displayName) {
      return false;
    }

    return parseWorkflowHistory(item).some((entry) => {
      const actionBy = (entry.CurrentApprover || entry.ActionBy || "")
        .trim()
        .toLowerCase();
      const actionTaken = (entry.ActionTaken || entry.Action || "")
        .trim()
        .toLowerCase();

      return actionBy === displayName && actionTaken.startsWith(matchPrefix);
    });
  };

  const getApprovalDashboardData = async (): Promise<void> => {
    setIsLoading(true);

    try {
      const response = await changeRequestOps.getChangeRequestData(
        "",
        { column: "Created", isAscending: false },
        props,
      );

      setDashboardData(response || []);
    } catch (error) {
      console.error("Approval dashboard fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (props.userEmail) {
      getApprovalDashboardData();
    }
  }, [props.userEmail]);

  React.useEffect(() => {
    let data = [...dashboardData];

    if (activeTab === "Pending Request") {
      data = data.filter(
        (item) =>
          item.Status === "Pending for Approval" &&
          currentUserId != null &&
          Number(item.CurrentApproverId) === Number(currentUserId),
      );
    }

    if (activeTab === "Approved") {
      data = data.filter((item) => userTookAction(item, "Approved"));
    }

    if (activeTab === "Rejected") {
      data = data.filter((item) => userTookAction(item, "Reject"));
    }

    setFilteredDashboardData(data);
  }, [dashboardData, activeTab, currentUserId]);

  const handleTabClick = (tab: ApprovalTab): void => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const filteredData = React.useMemo(() => {
    if (!searchText.trim()) {
      return filteredDashboardData;
    }

    const search = searchText.toLowerCase();

    return filteredDashboardData.filter(
      (item) =>
        item.RequestNo?.toLowerCase().includes(search) ||
        item.RequestType?.toLowerCase().includes(search) ||
        item.ProgramName?.toLowerCase().includes(search) ||
        item.Tcode?.toLowerCase().includes(search) ||
        item.RequestedBy?.toLowerCase().includes(search),
    );
  }, [filteredDashboardData, searchText]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchText]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const changePage = (page: number): void => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getUrgencyClass = (urgency: string): string => {
    switch (urgency) {
      case "Urgent":
        return "urgent-urgency";
      case "Early":
        return "early-urgency";
      case "Normal":
        return "normal-urgency";
      default:
        return "";
    }
  };

  return (
    <section className="dashboard-wrapper">
      {isLoading && (
        <div className="black-loader-overlay">
          <div className="loader" />
        </div>
      )}

      <div className="dashboard-sidebar">
        <div className="menu-icon">
          <FontAwesomeIcon icon={faBars} />
        </div>

        <div className="sidebar-menu-wrapper">
          <div className="sidebar-item-group">
            <div
              className="sidebar-item"
              onClick={() => toggleMenu("requesterDashboard")}
            >
              <span>Requester Dashboard</span>
              <FontAwesomeIcon
                icon={
                  expandedMenu === "requesterDashboard"
                    ? faChevronDown
                    : faChevronRight
                }
                className="sidebar-caret"
              />
            </div>

            {expandedMenu === "requesterDashboard" && (
              <div className="sidebar-submenu">
                <div
                  className="sidebar-subitem"
                  onClick={() => history.push("/Dashboard")}
                >
                  My Request
                </div>
                <div
                  className="sidebar-subitem"
                  onClick={() => history.push("/Dashboard")}
                >
                  Approved
                </div>
                <div
                  className="sidebar-subitem"
                  onClick={() => history.push("/Dashboard")}
                >
                  Rejected
                </div>
              </div>
            )}
          </div>

          <div className="sidebar-item-group">
            <div
              className="sidebar-item"
              onClick={() => toggleMenu("approverDashboard")}
            >
              <span>Approver Dashboard</span>
              <FontAwesomeIcon
                icon={
                  expandedMenu === "approverDashboard"
                    ? faChevronDown
                    : faChevronRight
                }
                className="sidebar-caret"
              />
            </div>

            {expandedMenu === "approverDashboard" && (
              <div className="sidebar-submenu">
                <div
                  className={`sidebar-subitem ${activeTab === "Pending Request" ? "active-tab" : ""}`}
                  onClick={() => handleTabClick("Pending Request")}
                >
                  Pending Request
                </div>
                <div
                  className={`sidebar-subitem ${activeTab === "Approved" ? "active-tab" : ""}`}
                  onClick={() => handleTabClick("Approved")}
                >
                  Approved
                </div>
                <div
                  className={`sidebar-subitem ${activeTab === "Rejected" ? "active-tab" : ""}`}
                  onClick={() => handleTabClick("Rejected")}
                >
                  Rejected
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-main">
        <div className="dashboard-header">
          <div className="header-left">
            <img
              src={logoSecondary}
              alt="CKA Birla Group Logo"
              className="logo-secondary"
            />
            <img src={logoPrimary} alt="nbc Logo" className="logo-primary" />
          </div>

          <div className="page-header">
            <h2 className="page-title">Change Request Management</h2>
          </div>

          <div className="header-right">
            <div className="user-name-new">
              <span className="welcome-text">Welcome, </span>
              {props.userDisplayName}
            </div>
            <div className="user-icon">
              <img src={userLogo} alt="User" />
            </div>
          </div>
        </div>

        <div className="dashboard-body">
          <div className="dashboard-filter-card">
            <div className="filter-right">
              <input
                className="dashboard-input"
                placeholder="Search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
          </div>

          <div className="table-card">
            <div className="table-wrapper">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Request No</th>
                    <th>Requested By</th>
                    <th>Request Type</th>
                    <th>Program Name</th>
                    <th>Tcode</th>
                    <th>Urgency of Request</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="no-data">
                        No records found
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((item) => (
                      <tr key={item.Id || 0}>
                        <td>{item.RequestNo}</td>
                        <td>{item.RequestedBy}</td>
                        <td>{item.RequestType}</td>
                        <td>{item.ProgramName}</td>
                        <td>{item.Tcode}</td>
                        <td>
                          <span
                            className={`urgency-badge ${getUrgencyClass(item.Urgencyofrequest)}`}
                          >
                            {item.Urgencyofrequest}
                          </span>
                        </td>
                        <td>{item.Status}</td>
                        <td>
                          <div className="action-btn-group">
                            <button
                              className="action-btn view-btn"
                              title="View"
                              onClick={() =>
                                history.push({
                                  pathname: `/ViewRequest/${item.Id}`,
                                  state: {
                                    from: "ApprovalDashboard",
                                  },
                                })
                              }
                            >
                              <FontAwesomeIcon icon={faEye} />
                            </button>

                            {activeTab === "Pending Request" && (
                              <button
                                className="action-btn edit-btn"
                                title="Approval Form"
                                onClick={() =>
                                  history.push(`/ApprovalForm/${item.Id}`)
                                }
                              >
                                <FontAwesomeIcon icon={faPenSquare} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filteredData.length > 0 && (
              <div className="pagination-wrapper">
                <button
                  className="page-btn"
                  disabled={currentPage === 1}
                  onClick={() => changePage(currentPage - 1)}
                >
                  Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      className={`page-btn ${currentPage === page ? "active-page" : ""}`}
                      onClick={() => changePage(page)}
                    >
                      {page}
                    </button>
                  ),
                )}

                <button
                  className="page-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => changePage(currentPage + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ApprovalDashboard;
