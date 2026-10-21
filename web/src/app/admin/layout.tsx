import React from "react";

import "./admin-design.css";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <div className="admin-app min-h-screen">{children}</div>;
}
