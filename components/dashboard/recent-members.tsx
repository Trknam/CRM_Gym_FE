import Link from "next/link";

const members = [
 ["Nguyễn Văn An","Gói 6 tháng","Đang hoạt động","04/09/2026"],
 ["Trần Minh Anh","Gói 3 tháng","Sắp hết hạn","08/09/2026"],
 ["Lê Quốc Huy","Gói 12 tháng","Đang hoạt động","20/11/2026"],
 ["Phạm Ngọc Mai","Gói 1 tháng","Hết hạn","01/09/2026"],
];

export function RecentMembers() {
 return <section className="card mt-6 overflow-hidden"><div className="flex items-center justify-between p-5"><div><h3 className="font-bold">Hội viên gần đây</h3><p className="text-xs text-[#98a2b3]">Các membership mới cập nhật</p></div><Link href="/members" className="text-xs font-semibold text-[#635bff]">Xem tất cả</Link></div>
 <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-[#fafbfc] text-xs text-[#667085]"><tr><th className="px-5 py-3">Hội viên</th><th>Gói tập</th><th>Trạng thái</th><th>Ngày hết hạn</th></tr></thead><tbody>{members.map(([name,pack,status,expiry])=><tr key={name} className="border-t border-[#eef0f4]"><td className="px-5 py-3 font-medium">{name}</td><td>{pack}</td><td><span className="rounded-full bg-[#f1f0ff] px-2.5 py-1 text-xs">{status}</span></td><td>{expiry}</td></tr>)}</tbody></table></div></section>;
}
