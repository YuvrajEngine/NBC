import { INbcProps } from "../../components/INbcProps";
import SPCRUDOPS from "../DAL/spcrudops";

export interface IChangeRequestItem {
  Id: number | null;

  Title: string;
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

  Status: string;

  Created: string | null;
  Modified: string | null;

  CreatedBy: string;
  CreatedById: number | null;
  CreatedByEmail: string;

  ModifiedBy: string;
  ModifiedById: number | null;
}

export interface IChangeRequestPayload {
  Title?: string;
  RequestNo?: string;

  RequestedBy?: string;
  ReportingManager?: string;
  EmployeeSAPNumberID?: string;
  EmployeeEmail?: string;
  CostCentre?: string;
  Department?: string;
  Grade?: string;

  ContactNumber?: number | null;

  ProgramConfigurationChange?: string;
  RequestType?: string;
  Remarks?: string;
  RequestDescriptionwithReason?: string;

  ProgramName?: string;
  Tcode?: string;

  Urgencyofrequest?: string;

  AdditionalInformation?: string;

  Status?: string;
}

export interface IChangeRequestOps {
  getChangeRequestData(
    filter: string,
    orderby: { column: string; isAscending: boolean },
    props: INbcProps,
  ): Promise<IChangeRequestItem[]>;

  getChangeRequestById(
    id: number,
    props: INbcProps,
  ): Promise<IChangeRequestItem | null>;

  generateRequestNo(props: INbcProps): Promise<string>;

  createChangeRequest(
    payload: IChangeRequestPayload,
    props: INbcProps,
  ): Promise<any>;

  updateChangeRequest(
    id: number,
    payload: IChangeRequestPayload,
    props: INbcProps,
  ): Promise<any>;

  deleteChangeRequest(id: number, props: INbcProps): Promise<any>;
}

export default function ChangeRequestOps(): IChangeRequestOps {
  const spCrudOps = SPCRUDOPS();

  const getChangeRequestData = async (
    filter: string,
    orderby: { column: string; isAscending: boolean },
    props: INbcProps,
  ): Promise<IChangeRequestItem[]> => {
    try {
      const spCrudOpsInstance = await spCrudOps;

      const results = await spCrudOpsInstance.getData(
        "ChangeRequest",

        `*,
        Author/Id,
        Author/Title,
        Author/EMail,
        Editor/Id,
        Editor/Title`,

        `Author,
        Editor`,

        filter,
        orderby,
        props,
      );

      const mapped: IChangeRequestItem[] = results.map((item: any) => ({
        Id: item.Id ?? null,

        Title: item.Title ?? "",
        RequestNo: item.RequestNo ?? "",

        RequestedBy: item.RequestedBy ?? "",
        ReportingManager: item.ReportingManager ?? "",
        EmployeeSAPNumberID: item.EmployeeSAPNumberID ?? "",
        EmployeeEmail: item.EmployeeEmail ?? "",
        CostCentre: item.CostCentre ?? "",
        Department: item.Department ?? "",
        Grade: item.Grade ?? "",

        ContactNumber: item.ContactNumber ?? null,

        ProgramConfigurationChange: item.ProgramConfigurationChange ?? "",
        RequestType: item.RequestType ?? "",
        Remarks: item.Remarks ?? "",
        RequestDescriptionwithReason: item.RequestDescriptionwithReason ?? "",

        ProgramName: item.ProgramName ?? "",
        Tcode: item.Tcode ?? "",

        Urgencyofrequest: item.Urgencyofrequest ?? "",

        AdditionalInformation: item.AdditionalInformation ?? "",

        Status: item.Status ?? "",

        Created: item.Created ?? null,
        Modified: item.Modified ?? null,

        CreatedBy: item.Author?.Title ?? "",
        CreatedById: item.Author?.Id ?? null,
        CreatedByEmail: item.Author?.EMail ?? "",

        ModifiedBy: item.Editor?.Title ?? "",
        ModifiedById: item.Editor?.Id ?? null,
      }));

      return mapped;
    } catch (error) {
      console.error("Error fetching ChangeRequest data:", error);
      throw error;
    }
  };

  const getChangeRequestById = async (
    id: number,
    props: INbcProps,
  ): Promise<IChangeRequestItem | null> => {
    try {
      const data = await getChangeRequestData(
        `Id eq ${id}`,
        {
          column: "Id",
          isAscending: false,
        },
        props,
      );

      return data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error("Error fetching ChangeRequest by Id:", error);
      throw error;
    }
  };

  const generateRequestNo = async (props: INbcProps): Promise<string> => {
    try {
      const spCrudOpsInstance = await spCrudOps;

      const results = await spCrudOpsInstance.getData(
        "ChangeRequest",
        "Id,RequestNo",
        "",
        "",
        { column: "Id", isAscending: false },
        props,
      );

      let maxNumber = 0;

      (results || []).forEach((item: any) => {
        const match = /^CRR-(\d+)$/.exec(item.RequestNo || "");

        if (match) {
          const num = parseInt(match[1], 10);

          if (num > maxNumber) {
            maxNumber = num;
          }
        }
      });

      const nextNumber = maxNumber + 1;

      return `CRR-${nextNumber.toString().padStart(3, "0")}`;
    } catch (error) {
      console.error("Error generating RequestNo:", error);
      throw error;
    }
  };

  const createChangeRequest = async (
    payload: IChangeRequestPayload,
    props: INbcProps,
  ): Promise<any> => {
    try {
      const spCrudOpsInstance = await spCrudOps;

      return await spCrudOpsInstance.insertData(
        "ChangeRequest",
        payload,
        props,
      );
    } catch (error) {
      console.error("Error creating ChangeRequest:", error);
      throw error;
    }
  };

  const updateChangeRequest = async (
    id: number,
    payload: IChangeRequestPayload,
    props: INbcProps,
  ): Promise<any> => {
    try {
      const spCrudOpsInstance = await spCrudOps;

      return await spCrudOpsInstance.updateData(
        "ChangeRequest",
        id,
        payload,
        props,
      );
    } catch (error) {
      console.error("Error updating ChangeRequest:", error);
      throw error;
    }
  };

  const deleteChangeRequest = async (
    id: number,
    props: INbcProps,
  ): Promise<any> => {
    try {
      const spCrudOpsInstance = await spCrudOps;

      return await spCrudOpsInstance.deleteData(
        "ChangeRequest",
        id,
        props,
      );
    } catch (error) {
      console.error("Error deleting ChangeRequest:", error);
      throw error;
    }
  };

  return {
    getChangeRequestData,
    getChangeRequestById,
    generateRequestNo,
    createChangeRequest,
    updateChangeRequest,
    deleteChangeRequest,
  };
}