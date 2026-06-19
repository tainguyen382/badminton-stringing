export interface dashboardData {
    monthlyData: {
        totalRevenue: any,
        serviceRevenue: any
    };
    totalRevenue: any;
    actualRevenue: any;
    totalexpense: any;
    netProfit: any;
    totalJobs: any;
}


export interface historyData {
    type: string;
    customer: string;
    racketModel: string;
    stringType: string;
    stringTension: string;
    servicePrice: number;
    serviceRevenue: number;
    paymentType: string;
    date: string;
}
