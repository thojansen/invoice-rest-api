import { ClientData, ClientsRepository } from "./clientsRepository";
import { InvoiceData, InvoicesRepository } from "./invoicesRepository";

type InvoiceWithClientDetails = {
    invoice: InvoiceData
    client: ClientData
}

export type InvoiceListingSortingByArgs = {
    date?: "asc" | "desc"
    price?: "asc" | "desc"
    companyName?: "asc" | "desc"
}

export type InvoiceListingFilterByArgs = {
    clientId?: string
    date?: {
        start?: number
        end?: number
    }
}

export type ClientListingSortingByArgs = {
    clientName?: "asc" | "desc"
    companyName?: "asc" | "desc"
    totalBilled?: "asc" | "desc"
}

export type ClientListingFilterByArgs = {
    clientName?: string
    companyName?: string
}

export class ClientInvoicesRepoAggregate {
    private static _instance: ClientInvoicesRepoAggregate;
    
    static async getInstance () {
        if (!ClientInvoicesRepoAggregate._instance) {
            ClientInvoicesRepoAggregate._instance = new ClientInvoicesRepoAggregate();
            ClientInvoicesRepoAggregate._instance.invoicesRepo = await InvoicesRepository.getInstance();
            ClientInvoicesRepoAggregate._instance.clientsRepo = await ClientsRepository.getInstance();
        }
        return ClientInvoicesRepoAggregate._instance;
    }

    private invoicesRepo: InvoicesRepository;
    private clientsRepo: ClientsRepository;

    async getInvoices(params: {userId:string, filter?: InvoiceListingFilterByArgs, sort?: InvoiceListingSortingByArgs, offset?: number, limit?: number}) {
        const { filter = {}, sort = {}, userId, offset = 0, limit = 20 } = params;
        
        const allInvoices = this.invoicesRepo.getByUserId(userId)
        const allResults: InvoiceWithClientDetails[] = [];
        for ( let i = 0; i < allInvoices.length; i += 1 ) {
            allResults.push({
                invoice: allInvoices[i],
                client: await this.clientsRepo.getById(allInvoices[i].client_id)
            })
        }

        let filteredResults = allResults;
        if ( Object.keys(filter).length ) {
            if ( filter.clientId ) {
                filteredResults = filteredResults.filter((item) => {
                    return item.client.id === filter.clientId
                })
            }

            if ( filter.date ) {
                const startDate = filter.date.start ?? -Infinity;
                const endDate = filter.date.end ?? Infinity;
                filteredResults = filteredResults.filter((item) => {
                    return item.invoice.date >= startDate && item.invoice.date < endDate;
                })
            }
           
        }

        let sortedResults = filteredResults;
        if ( Object.keys(sort).length ) {
            if ( sort.date ) {
                const coef = sort.date === 'asc' ? 1 : -1
                sortedResults = sortedResults.sort((a,b) => {
                    if ( a.invoice.date > b.invoice.date ) {
                        return coef;
                    } 
                    return -coef;
                });
            }

            if ( sort.companyName ) {
                const coef = sort.companyName === 'asc' ? 1 : -1;
                sortedResults = sortedResults.sort((a, b) => {
                    if ( a.client.companyDetails.name > b.client.companyDetails.name ) {
                        return coef;
                    } 
                    return -coef;
                })
            }

            if ( sort.price ) {
                const coef = sort.price === 'asc' ? 1 : -1;
                sortedResults = sortedResults.sort((a, b) => {
                    if ( a.invoice.value > b.invoice.value ) {
                        return coef;
                    } 
                    return -coef;
                })
            }
        }

        return sortedResults;
    }


    async getClients(params: { userId: string; filter: InvoiceListingFilterByArgs; sort: ClientListingSortingByArgs; offset?: number, limit?: number }) {
        const { filter = {}, sort = {}, userId, offset = 0, limit = 20 } = params;
        const allClients = await this.clientsRepo.getByUserId(userId)
        const allInvoices = await this.invoicesRepo.getByUserId(userId)


        const allClientsWithTotalBilled = allClients.map((client) => {
            return {
                ...client,
                totalBilled: allInvoices.reduce((acc, item) => {
                    if ( item.client_id === client.id) {
                        return acc + item.value
                    }
                    return acc;
                }, 0)
            }
        })

        let sortedResults = allClientsWithTotalBilled;
        if ( Object.keys(sort).length ) {
            if ( sort.clientName ) {
                const coef = sort.clientName === 'asc' ? 1 : -1
                sortedResults = sortedResults.sort((a,b) => {
                    if ( a.name > b.name ) {
                        return coef;
                    } 
                    return -coef;
                });
            }

            if ( sort.companyName ) {
                const coef = sort.companyName === 'asc' ? 1 : -1;
                sortedResults = sortedResults.sort((a, b) => {
                    if ( a.companyDetails.name > b.companyDetails.name ) {
                        return coef;
                    } 
                    return -coef;
                })
            }

            if ( sort.totalBilled ) {
                const coef = sort.totalBilled === 'asc' ? 1 : -1;
                sortedResults = sortedResults.sort((a, b) => {
                    if ( a.totalBilled > b.totalBilled ) {
                        return coef;
                    } 
                    return -coef;
                })
            }
        }

        return sortedResults;
    }
}
