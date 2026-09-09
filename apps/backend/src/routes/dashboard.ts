import { Router } from "express";
import { requireUser,getAccessibleBranchIds } from "../auth/authorization";
import { getDashboardMetrics } from "../services/dashboard-metrics";
import { cacheGet,cacheSet } from "../cache/valkey";
import { cacheKeys } from "../cache/keys";
export const dashboardRoutes=Router();
dashboardRoutes.get("/",async(req,res)=>{try{await requireUser(req);const ids=await getAccessibleBranchIds(req),key=cacheKeys.dashboard(ids===null?"all":ids.sort().join(",")||"none"),cached=await cacheGet<any>(key);if(cached)return res.json({data:cached,cached:true});const data=await getDashboardMetrics(ids);const serializable={...data,recentMembers:data.recentMembers.map(m=>({...m,expiry:m.expiry?.toISOString()??null}))};await cacheSet(key,serializable,30);return res.json({data:serializable,cached:false});}catch(error){const s=(error as any)?.status;if(s)return res.status(s).json({message:(error as any).message});console.error("[dashboard] failed",error);return res.status(500).json({message:"Không thể lấy dữ liệu Dashboard."});}});
