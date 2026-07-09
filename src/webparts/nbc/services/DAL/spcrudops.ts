import { spfi, SPFx } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import "@pnp/sp/folders";
import "@pnp/sp/files";
import "@pnp/sp/attachments";
import "@pnp/sp/site-users/web";
import "@pnp/sp/site-groups/web";
import "@pnp/sp/batching";
import { HttpClient, HttpClientResponse } from '@microsoft/sp-http';
import { INbcProps } from "../../components/INbcProps";

export interface ISPCRUDOPS {
    getData(listName: string, columnsToRetrieve: string, columnsToExpand: string, filters: string, orderby: { column: string, isAscending: boolean }, props: INbcProps): Promise<any[]>;
    getRootData(listName: string, columnsToRetrieve: string, columnsToExpand: string, filters: string, orderby: { column: string, isAscending: boolean }, props: INbcProps): Promise<any>;
    getItemData(listName: string, id: number, select: string, expand: string, props: INbcProps): Promise<any>;
    insertData(listName: string, data: any, props: INbcProps): Promise<any>;
    insertRootData(listName: string, data: any, props: INbcProps): Promise<any>;
    updateData(listName: string, itemId: number, data: any, props: INbcProps): Promise<any>;
    updateRootData(listName: string, itemId: number, data: any, props: INbcProps): Promise<any>;
    deleteData(listName: string, itemId: number, props: INbcProps): Promise<any>;
    getListInfo(listName: string, props: INbcProps): Promise<any>;
    getListData(listName: string, columnsToRetrieve: string, props: INbcProps): Promise<any>;
    batchInsert(listName: string, data: any, props: INbcProps): Promise<any>;
    batchUpdate(listName: string, data: any, props: INbcProps): Promise<any>;
    batchDelete(listName: string, data: any, props: INbcProps): Promise<any>;
    createFolder(listName: string, folderName: string, props: INbcProps): Promise<any>;
    uploadFile(folderServerRelativeUrl: string, file: File, props: INbcProps): Promise<any>;
    deleteFile(fileServerRelativeUrl: string, props: INbcProps): Promise<any>;
    currentProfile(props: INbcProps): Promise<any>;
    getLoggedInSiteGroups(props: INbcProps): Promise<any>;
    getAllSiteGroups(props: INbcProps): Promise<any>;
    getTopData(listName: string, columnsToRetrieve: string, columnsToExpand: string, filters: string
        , orderby: { column: string, isAscending: boolean }, top: number, props: INbcProps): Promise<any>;
    addAttchmentInList(data: File, listName: string, itemId: number, fileName: string, props: INbcProps): Promise<any>;
    getAttachments(listName: string, itemId: number, props: INbcProps): Promise<any[]>;
    uploadAttachment(listName: string, itemId: number, file: File, props: INbcProps): Promise<any>;
    deleteAttachment(listName: string, itemId: number, fileName: string, props: INbcProps): Promise<any>;
}

class SPCRUDOPSImpl implements ISPCRUDOPS {

    private ensureContext(props: INbcProps): void {
        if (!props.currentSPContext || !props.currentSPContext.pageContext) {
            throw new Error('SharePoint context is not available');
        }
    }

    private getSP(url: string, props: INbcProps) {
        this.ensureContext(props);
        return spfi(url).using(SPFx(props.currentSPContext));
    }

    private getRootUrl(props: INbcProps): string {
        const fullUrl = props.currentSPContext.pageContext.web.absoluteUrl;
        const parts = fullUrl.split('/');
        return parts.slice(0, 5).join('/');
    }

    async getData(listName: string, columnsToRetrieve: string, columnsToExpand: string, filters: string, orderby: { column: string, isAscending: boolean }, props: INbcProps): Promise<any[]> {
        this.ensureContext(props);
        const sp = this.getSP(props.currentSPContext.pageContext.web.absoluteUrl, props);
        const pageSize = 5000;
        let allItems: any[] = [];
        let lastId = 0;

        while (true) {
            let query = sp.web.lists.getByTitle(listName).items;
            if (columnsToRetrieve) {
                query = query.select(columnsToRetrieve);
            }
            if (columnsToExpand) {
                query = query.expand(columnsToExpand);
            }
            const idCondition = `Id gt ${lastId}`;
            const combinedFilter = filters ? `(${filters}) and ${idCondition}` : idCondition;
            query = query.filter(combinedFilter).orderBy("Id", true).top(pageSize);

            const page = await query();
            allItems = allItems.concat(page);

            if (page.length < pageSize) {
                break;
            }
            lastId = page[page.length - 1].Id;
        }

        if (orderby?.column) {
            allItems.sort((a: any, b: any) => {
                const av = a[orderby.column];
                const bv = b[orderby.column];
                if (av === bv) return 0;
                const result = av > bv ? 1 : -1;
                return orderby.isAscending ? result : -result;
            });
        }

        return allItems;
    }

    async getRootData(listName: string, columnsToRetrieve: string, columnsToExpand: string, filters: string, orderby: { column: string, isAscending: boolean }, props: INbcProps): Promise<any> {
        this.ensureContext(props);
        const baseUrl = this.getRootUrl(props);
        const sp = this.getSP(baseUrl, props);
        const pageSize = 5000;
        let allItems: any[] = [];
        let lastId = 0;

        while (true) {
            let query = sp.web.lists.getByTitle(listName).items;
            if (columnsToRetrieve) {
                query = query.select(columnsToRetrieve);
            }
            if (columnsToExpand) {
                query = query.expand(columnsToExpand);
            }
            const idCondition = `Id gt ${lastId}`;
            const combinedFilter = filters ? `(${filters}) and ${idCondition}` : idCondition;
            query = query.filter(combinedFilter).orderBy("Id", true).top(pageSize);

            const page = await query();
            allItems = allItems.concat(page);

            if (page.length < pageSize) {
                break;
            }
            lastId = page[page.length - 1].Id;
        }

        if (orderby?.column) {
            allItems.sort((a: any, b: any) => {
                const av = a[orderby.column];
                const bv = b[orderby.column];
                if (av === bv) return 0;
                const result = av > bv ? 1 : -1;
                return orderby.isAscending ? result : -result;
            });
        }

        return allItems;
    }

    async getItemData(listName: string, id: number, select: string, expand: string, props: INbcProps): Promise<any> {
        const sp = this.getSP(props.currentSPContext.pageContext.web.absoluteUrl, props);
        return await sp.web.lists.getByTitle(listName).items.getById(id).select(select).expand(expand)();
    }

    async insertData(listName: string, data: any, props: INbcProps): Promise<any> {
        const sp = this.getSP(props.currentSPContext.pageContext.web.absoluteUrl, props);
        return await sp.web.lists.getByTitle(listName).items.add(data);
    }

    async insertRootData(listName: string, data: any, props: INbcProps): Promise<any> {
        const baseUrl = this.getRootUrl(props);
        const sp = this.getSP(baseUrl, props);
        return await sp.web.lists.getByTitle(listName).items.add(data);
    }

    async updateData(listName: string, itemId: number, data: any, props: INbcProps): Promise<any> {
        const sp = this.getSP(props.currentSPContext.pageContext.web.absoluteUrl, props);
        return await sp.web.lists.getByTitle(listName).items.getById(itemId).update(data);
    }

    async updateRootData(listName: string, itemId: number, data: any, props: INbcProps): Promise<any> {
        const baseUrl = this.getRootUrl(props);
        const sp = this.getSP(baseUrl, props);
        return await sp.web.lists.getByTitle(listName).items.getById(itemId).update(data);
    }

    async deleteData(listName: string, itemId: number, props: INbcProps): Promise<any> {
        const sp = this.getSP(props.currentSPContext.pageContext.web.absoluteUrl, props);
        return await sp.web.lists.getByTitle(listName).items.getById(itemId).delete();
    }

    async getListInfo(listName: string, props: INbcProps): Promise<any> {
        const sp = this.getSP(props.currentSPContext.pageContext.web.absoluteUrl, props);
        return await sp.web.lists.getByTitle(listName)();
    }

    async getListData(listName: string, columnsToRetrieve: string, props: INbcProps): Promise<any> {
        const sp = this.getSP(props.currentSPContext.pageContext.web.absoluteUrl, props);
        let items = sp.web.lists.getByTitle(listName).items;
        if (columnsToRetrieve) {
            items = items.select(columnsToRetrieve);
        }
        return await items();
    }

    async batchInsert(listName: string, data: any, props: INbcProps): Promise<any> {
        const sp = this.getSP(props.currentSPContext.pageContext.web.absoluteUrl, props);
        const [batchedSP, execute] = sp.batched();
        const pending: Promise<any>[] = [];
        data.forEach((item: any) => {
            pending.push(batchedSP.web.lists.getByTitle(listName).items.add(item));
        });
        await execute();
        return Promise.all(pending);
    }

    async batchUpdate(listName: string, data: any, props: INbcProps): Promise<any> {
        const sp = this.getSP(props.currentSPContext.pageContext.web.absoluteUrl, props);
        const [batchedSP, execute] = sp.batched();
        const pending: Promise<any>[] = [];
        data.forEach((item: any) => {
            pending.push(batchedSP.web.lists.getByTitle(listName).items.getById(item.Id).update(item));
        });
        await execute();
        return Promise.all(pending);
    }

    async batchDelete(listName: string, data: any, props: INbcProps): Promise<any> {
        const sp = this.getSP(props.currentSPContext.pageContext.web.absoluteUrl, props);
        const [batchedSP, execute] = sp.batched();
        const pending: Promise<any>[] = [];
        data.forEach((item: any) => {
            pending.push(batchedSP.web.lists.getByTitle(listName).items.getById(item.Id).delete());
        });
        await execute();
        return Promise.all(pending);
    }

    async createFolder(listName: string, folderName: string, props: INbcProps): Promise<any> {
        const sp = this.getSP(props.currentSPContext.pageContext.web.absoluteUrl, props);
        return await sp.web.lists.getByTitle(listName).rootFolder.folders.addUsingPath(folderName);
    }

    async uploadFile(folderServerRelativeUrl: string, file: File, props: INbcProps): Promise<any> {
        const sp = this.getSP(props.currentSPContext.pageContext.web.absoluteUrl, props);
        return await sp.web
            .getFolderByServerRelativePath(folderServerRelativeUrl)
            .files.addUsingPath(file.name, file, { Overwrite: true });
    }

    async deleteFile(fileServerRelativeUrl: string, props: INbcProps): Promise<any> {
        const sp = this.getSP(props.currentSPContext.pageContext.web.absoluteUrl, props);
        return await sp.web.getFileByServerRelativePath(fileServerRelativeUrl).delete();
    }

    async currentProfile(props: INbcProps): Promise<any> {
        const sp = this.getSP(props.currentSPContext.pageContext.web.absoluteUrl, props);
        return await sp.web.currentUser();
    }

    async getLoggedInSiteGroups(props: INbcProps): Promise<any> {
        const sp = this.getSP(props.currentSPContext.pageContext.web.absoluteUrl, props);
        return await sp.web.currentUser.groups();
    }

    async getAllSiteGroups(props: INbcProps): Promise<any> {
        const sp = this.getSP(props.currentSPContext.pageContext.web.absoluteUrl, props);
        return await sp.web.siteGroups();
    }

    async getTopData(listName: string, columnsToRetrieve: string, columnsToExpand: string, filters: string
        , orderby: { column: string, isAscending: boolean }, top: number, props: INbcProps): Promise<any> {
        const sp = this.getSP(props.currentSPContext.pageContext.web.absoluteUrl, props);
        let items = sp.web.lists.getByTitle(listName).items;
        if (columnsToRetrieve) {
            items = items.select(columnsToRetrieve);
        }
        if (columnsToExpand) {
            items = items.expand(columnsToExpand);
        }
        if (filters) {
            items = items.filter(filters);
        }
        if (orderby) {
            items = items.orderBy(orderby.column, orderby.isAscending);
        }
        if (top) {
            items = items.top(top);
        }
        return await items();
    }

    async addAttchmentInList(data: File, listName: string, itemId: number, fileName: string, props: INbcProps): Promise<any> {
        const sp = this.getSP(props.currentSPContext.pageContext.web.absoluteUrl, props);
        return await sp.web.lists.getByTitle(listName).items.getById(itemId).attachmentFiles.add(fileName, data);
    }

    async getAttachments(listName: string, itemId: number, props: INbcProps): Promise<any[]> {
        try {
            const sp = this.getSP(props.currentSPContext.pageContext.web.absoluteUrl, props);
            const files = await sp.web.lists
                .getByTitle(listName)
                .items.getById(itemId)
                .attachmentFiles();

            return files.map(f => ({ name: f.FileName, url: f.ServerRelativeUrl }));
        } catch (error) {
            console.error("Error fetching attachments:", error);
            return [];
        }
    }

    async uploadAttachment(listName: string, itemId: number, file: any, props: INbcProps): Promise<any> {
        try {
            const sp = this.getSP(props.currentSPContext.pageContext.web.absoluteUrl, props);
            await sp.web.lists
                .getByTitle(listName)
                .items.getById(itemId)
                .attachmentFiles.add(file.name, file);
        } catch (error) {
            console.error("Error uploading attachment:", error);
            throw error;
        }
    }

    async deleteAttachment(listName: string, itemId: number, fileName: any, props: INbcProps): Promise<any> {
        try {
            const sp = this.getSP(props.currentSPContext.pageContext.web.absoluteUrl, props);
            await sp.web.lists
                .getByTitle(listName)
                .items.getById(itemId)
                .attachmentFiles.getByName(fileName)
                .delete();

            console.log(`Deleted ${fileName} successfully`);
        } catch (error: any) {
            console.error("Error deleting attachment:", error.message || error);
            throw error;
        }
    }

}

export default function SPCRUDOPS(): Promise<ISPCRUDOPS> {
    return Promise.resolve(new SPCRUDOPSImpl());
}