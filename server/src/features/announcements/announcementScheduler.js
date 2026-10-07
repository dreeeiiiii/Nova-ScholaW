import { deliverPublication } from './announcementEmail.js';
import { publishDueAnnouncements } from './announcementModel.js';
import { logAction } from '../audit/auditService.js';

export async function publishScheduled() {
  const rows=await publishDueAnnouncements();
  for(const row of rows)await logAction({userId:row.author_id,action:'announcement.publish',entityType:'announcement',entityId:row.id,details:{type:row.type,scheduled:true}});
  for(const row of rows)await deliverPublication(row.id);
  return rows;
}
export function startAnnouncementScheduler() {
  let running=false;
  const tick=async()=>{if(running)return;running=true;try{await publishScheduled();}catch{console.error('[announcements] Scheduled publication failed');}finally{running=false;}};
  const timer=setInterval(tick,30000);timer.unref();void tick();
  return ()=>clearInterval(timer);
}
