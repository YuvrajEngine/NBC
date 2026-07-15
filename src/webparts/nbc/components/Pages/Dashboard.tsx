import * as React from "react";
import { useHistory } from "react-router-dom";
import type { INbcProps } from "../INbcProps";
import {
  faBars,
  faPlus,
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

type RequesterTab = "MyRequest" | "Approved" | "Rejected";

const Dashboard: React.FC<INbcProps> = (props) => {
  const history = useHistory();
  const changeRequestOps = React.useMemo(() => ChangeRequestOps(), []);
  const [expandedMenu, setExpandedMenu] = React.useState<string | null>(
    "requesterDashboard",
  );
  const [activeTab, setActiveTab] = React.useState<RequesterTab>("MyRequest");
  const [isLoading, setIsLoading] = React.useState(false);
  const [dashboardData, setDashboardData] = React.useState<
    IChangeRequestItem[]
  >([]);
  const [searchText, setSearchText] = React.useState("");
  const [requestNoFilter, setRequestNoFilter] = React.useState("All");
  const [requestTypeFilter, setRequestTypeFilter] = React.useState("All");
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  const toggleMenu = (menu: string): void => {
    setExpandedMenu((prev) => (prev === menu ? null : menu));
  };

  const handleTabClick = (tab: RequesterTab): void => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const getDashboardData = async (): Promise<void> => {
    setIsLoading(true);

    try {
      const response = await changeRequestOps.getChangeRequestData(
        `EmployeeEmail eq '${props.userEmail}'`,
        { column: "Created", isAscending: false },
        props,
      );

      const ownRequests = (response || []).filter(
        (item: IChangeRequestItem) =>
          item.EmployeeEmail?.toLowerCase() === props.userEmail?.toLowerCase(),
      );

      setDashboardData(ownRequests);
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (props.userEmail) {
      getDashboardData();
    }
  }, [props.userEmail]);

  const tabFilteredData = React.useMemo(() => {
    if (activeTab === "MyRequest") {
      return dashboardData.filter(
        (item) => item.Status !== "Approved" && item.Status !== "Reject",
      );
    }

    if (activeTab === "Approved") {
      return dashboardData.filter((item) => item.Status === "Approved");
    }

    return dashboardData.filter((item) => item.Status === "Reject");
  }, [dashboardData, activeTab]);

  const requestNoOptions = React.useMemo(() => {
    const uniqueNos = Array.from(
      new Set(dashboardData.map((item) => item.RequestNo).filter(Boolean)),
    );

    return uniqueNos.sort();
  }, [dashboardData]);

  const filteredData = React.useMemo(() => {
    let data = [...tabFilteredData];

    if (requestNoFilter !== "All") {
      data = data.filter((item) => item.RequestNo === requestNoFilter);
    }

    if (requestTypeFilter !== "All") {
      data = data.filter((item) => item.RequestType === requestTypeFilter);
    }

    if (searchText.trim()) {
      const search = searchText.toLowerCase();

      data = data.filter(
        (item) =>
          item.RequestNo?.toLowerCase().includes(search) ||
          item.RequestType?.toLowerCase().includes(search) ||
          item.ProgramName?.toLowerCase().includes(search) ||
          item.Tcode?.toLowerCase().includes(search) ||
          item.Status?.toLowerCase().includes(search),
      );
    }

    return data;
  }, [tabFilteredData, requestNoFilter, requestTypeFilter, searchText]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchText, requestNoFilter, requestTypeFilter, activeTab]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const changePage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
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
                  className={`sidebar-subitem ${activeTab === "MyRequest" ? "active-tab" : ""}`}
                  onClick={() => handleTabClick("MyRequest")}
                >
                  My Request
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
                  className="sidebar-subitem"
                  onClick={() => history.push("/ApprovalDashboard")}
                >
                  Pending Request
                </div>
                <div
                  className="sidebar-subitem"
                  onClick={() => history.push("/ApprovalDashboard")}
                >
                  Approved
                </div>
                <div
                  className="sidebar-subitem"
                  onClick={() => history.push("/ApprovalDashboard")}
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
              {props.userDisplayName}
            </div>
            <div className="user-icon">
              <img src={userLogo} alt="User" />
            </div>
          </div>
        </div>

        <div className="dashboard-body">
          <div className="dashboard-filter-card">
            <div className="filter-left">
              <select
                className="dashboard-select"
                value={requestNoFilter}
                onChange={(e) => setRequestNoFilter(e.target.value)}
              >
                <option value="All">Request No</option>
                {requestNoOptions.map((reqNo) => (
                  <option key={reqNo} value={reqNo}>
                    {reqNo}
                  </option>
                ))}
              </select>

              <select
                className="dashboard-select"
                value={requestTypeFilter}
                onChange={(e) => setRequestTypeFilter(e.target.value)}
              >
                <option value="All">Request Type</option>
                <option value="New Development">New Development</option>
                <option value="Existing">Existing</option>
              </select>
            </div>

            <div className="filter-right">
              <input
                className="dashboard-input"
                placeholder="Search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />

              {activeTab === "MyRequest" && (
                <button
                  className="new-po-btn"
                  onClick={() => history.push("/NewRequest")}
                >
                  <FontAwesomeIcon icon={faPlus} />
                  <span>New Change Request</span>
                </button>
              )}
            </div>
          </div>

          <div className="table-card">
            <div className="table-wrapper">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Request No</th>
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
                      <td colSpan={7} className="no-data">
                        No records found
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((item) => (
                      <tr key={item.Id || 0}>
                        <td>{item.RequestNo}</td>
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
                                history.push(`/ViewRequest/${item.Id}`)
                              }
                            >
                              <FontAwesomeIcon icon={faEye} />
                            </button>

                            {activeTab === "MyRequest" &&
                              item.Status !== "Pending for Approval" && (
                                <button
                                  className="action-btn edit-btn"
                                  title="Edit"
                                  onClick={() =>
                                    history.push(`/EditRequest/${item.Id}`)
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

export default Dashboard;