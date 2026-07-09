import { INbcProps } from "../../components/INbcProps";
import SPCRUDOPS from "../DAL/spcrudops";

export interface IEmployeeMasterItem {
  Id: number | null;
  Title: string;
  EmployeeName: string;
  EmployeeCode: string;
  EmployeeSAPID: string;
  EmployeeEmail: string;
  ContactNo: string;
  Division: string;
  Location: string;
  Status: string;
  CostCentre: string;
  Grade: string;

  ReportingManager: string;
  ReportingManagerId: number | null;
  ReportingManagerEmail: string;

  Employee: string;
  EmployeeId: number | null;
  EmployeeLoginEmail: string;

  Department: string;
  DepartmentId: number | null;

  Created: string | null;
  Modified: string | null;

  CreatedBy: string;
  CreatedById: number | null;

  ModifiedBy: string;
  ModifiedById: number | null;
}

export interface IEmployeeMasterOps {
  getEmployeeMasterData(
    Filter: any,
    orderby: any,
    props: INbcProps,
  ): Promise<IEmployeeMasterItem[]>;
}

export default function EmployeeMasterOps(): IEmployeeMasterOps {
  const spCrudOps = SPCRUDOPS();

  const getEmployeeMasterData = async (
    Filter: any,
    orderby: any,
    props: INbcProps,
  ): Promise<IEmployeeMasterItem[]> => {
    if (!props) {
      throw new Error("[EmployeeMasterOps] props is undefined.");
    }

    if (!props.currentSPContext || !props.currentSPContext.pageContext) {
      throw new Error(
        "[EmployeeMasterOps] SharePoint context is not initialized."
      );
    }

    try {
      const spCrudOpsInstance = await spCrudOps;

      const results = await spCrudOpsInstance.getData(
        "EmployeeMaster",

        `*,
        ReportingManager/Id,
        ReportingManager/Title,
        ReportingManager/EMail,

        Employee/Id,
        Employee/Title,
        Employee/EMail,

        Department/Id,
        Department/Department,

        Author/Id,
        Author/Title,

        Editor/Id,
        Editor/Title`,

        `ReportingManager,
        Employee,
        Department,
        Author,
        Editor`,

        Filter,
        orderby,
        props
      );

      const mapped: IEmployeeMasterItem[] = results.map((item: any) => ({
        Id: item.Id ?? null,
        Title: item.Title ?? "",
        EmployeeName: item.EmployeeName ?? "",
        EmployeeCode: item.EmployeeCode ?? "",
        EmployeeSAPID: item.EmployeeSAPID ?? "",
        EmployeeEmail: item.EmployeeEmail ?? "",
        ContactNo: item.ContactNo ?? "",
        Division: item.Division ?? "",
        Location: item.Location ?? "",
        Status: item.Status ?? "",
        CostCentre: item.CostCentre ?? "",
        Grade: item.Grade ?? "",

        ReportingManager: item.ReportingManager?.Title ?? "",
        ReportingManagerId: item.ReportingManager?.Id ?? null,
        ReportingManagerEmail: item.ReportingManager?.EMail ?? "",

        Employee: item.Employee?.Title ?? "",
        EmployeeId: item.Employee?.Id ?? null,
        EmployeeLoginEmail: item.Employee?.EMail ?? "",

        Department: item.Department?.Department ?? "",
        DepartmentId: item.Department?.Id ?? null,

        Created: item.Created ?? null,
        Modified: item.Modified ?? null,

        CreatedBy: item.Author?.Title ?? "",
        CreatedById: item.Author?.Id ?? null,

        ModifiedBy: item.Editor?.Title ?? "",
        ModifiedById: item.Editor?.Id ?? null,
      }));

      return mapped;
    } catch (error) {
      console.error("[EmployeeMasterOps] Error:", error);
      throw error;
    }
  };

  return {
    getEmployeeMasterData,
  };
}