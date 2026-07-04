(function () {
  const svgNamespace = "http://www.w3.org/2000/svg";
  const ranges = ["Daily", "Weekly", "Monthly", "Yearly"];
  const defaultRange = "Monthly";

  const appState = {
    branch: "All Network Branches",
    timeframe: "Last 30 days",
    comparison: "vs. Previous period",
  };
  const zyephrDerived = window.ZYEPHR_DASHBOARD_DATA || null;
  const zyephrBranchNames = Array.isArray(zyephrDerived?.branchNames) && zyephrDerived.branchNames.length ? zyephrDerived.branchNames : ["Westside", "Eastview", "Northgate", "Southpoint", "Central", "Riverside"];

  function regExpEscape(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function formatInrCr(value, decimals = 1) {
    return `₹${Number(value || 0).toFixed(decimals)}Cr`;
  }

  function formatSignedPercent(value, decimals = 1) {
    const numeric = Number(value || 0);
    return `${numeric > 0 ? "+" : ""}${numeric.toFixed(decimals)}%`;
  }

  const roleProfiles = {
    CEO: { name: "Sarah Chen", role: "CEO", scope: "All Branches", initials: "SC", home: "/overview?role=CEO" },
    COO: { name: "Sarah Chen", role: "COO", scope: "All Branches", initials: "SC", home: "/overview?role=COO" },
    HR_ADMIN: { name: "HR Admin", role: "HR Admin", scope: "HRMS", initials: "HR", home: "/hrms?role=HR_ADMIN&tab=overview" },
  };

  function normalizeRole(value) {
    const role = String(value || "").replace(/[\s-]+/g, "_").toUpperCase();
    if (role === "CEO" || role === "COO" || role === "HR_ADMIN") return role;
    return null;
  }

  function roleLabel(role) {
    return roleProfiles[role]?.role || role;
  }

  let trustedPersonaNavigation = null;
  const nativeReplaceState = window.history.replaceState.bind(window.history);

  function trustPersonaNavigation(url, role) {
    trustedPersonaNavigation = {
      pathname: url.pathname,
      role,
      expiresAt: Date.now() + 900,
    };
    window.setTimeout(() => {
      if (trustedPersonaNavigation?.expiresAt <= Date.now()) trustedPersonaNavigation = null;
    }, 950);
  }

  window.history.replaceState = function replaceStateWithPersonaGuard(state, title, url) {
    if (url && trustedPersonaNavigation && trustedPersonaNavigation.expiresAt > Date.now()) {
      const target = new URL(url, window.location.origin);
      if (target.pathname !== trustedPersonaNavigation.pathname) return;
    }
    return nativeReplaceState(state, title, url);
  };

  const rangeSeries = {
    Daily: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      current: [32.5, 41.8, 36.2, 50.6, 43.4, 55.2, 48.8],
      previous: [30.9, 35.4, 33.8, 39.6, 36.9, 42.7, 40.2],
      target: [45.5, 45.5, 45.5, 45.5, 45.5, 45.5, 45.5],
    },
    Weekly: {
      labels: ["W1", "W2", "W3", "W4", "W5", "W6"],
      current: [31.4, 43.7, 38.1, 52.4, 46.6, 56.8],
      previous: [29.7, 34.8, 36.2, 40.8, 37.9, 43.6],
      target: [46, 46, 46, 46, 46, 46],
    },
    Monthly: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      current: [33.2, 42.6, 37.4, 51.8, 44.1, 56.2],
      previous: [30.8, 35.6, 34.0, 40.2, 37.1, 42.8],
      target: [46, 46, 46, 46, 46, 46],
    },
    Yearly: {
      labels: ["2021", "2022", "2023", "2024", "2025", "2026"],
      current: [28.4, 37.8, 34.2, 45.6, 41.9, 55.4],
      previous: [25.9, 31.4, 33.2, 35.8, 39.2, 43.1],
      target: [38, 40, 42, 44, 46, 48],
    },
  };

  const branchModifiers = {
    "All Network Branches": 0,
    ...Object.fromEntries(zyephrBranchNames.map((name, index) => [name, (zyephrBranchNames.length - index - 1) * 0.8 - 1.2])),
  };

  const chartMeta = [
    {
      match: /revenue trend/i,
      xLabel: "Time period",
      yLabel: "Revenue (₹Cr)",
      legend: [
        { key: "current", label: "Current period", color: "var(--color-primary)", style: "solid" },
        { key: "previous", label: "Previous period", color: "#4f7fa8", style: "dashed" },
        { key: "target", label: "Target", color: "#d6a94a", style: "solid" },
      ],
    },
    {
      match: /ebitda trend/i,
      xLabel: "Time period",
      yLabel: "EBITDA margin (%)",
      legend: [
        { key: "current", label: "Current period", color: "var(--color-primary)", style: "solid" },
        { key: "previous", label: "Previous period", color: "#4f7fa8", style: "dashed" },
      ],
    },
    {
      match: /occupancy trend/i,
      xLabel: "Time period",
      yLabel: "Occupancy (%)",
      legend: [
        { key: "current", label: "Current period", color: "var(--color-primary)", style: "solid" },
        { key: "previous", label: "Previous period", color: "#4f7fa8", style: "dashed" },
      ],
    },
    {
      match: /alos trend/i,
      xLabel: "Time period",
      yLabel: "ALOS (days)",
      legend: [
        { key: "current", label: "Current period", color: "var(--color-primary)", style: "solid" },
        { key: "previous", label: "Previous period", color: "#4f7fa8", style: "dashed" },
      ],
    },
    {
      match: /admission trend|procedure trend|tat trend/i,
      xLabel: "Time period",
      yLabel: "Operational volume",
      legend: [
        { key: "current", label: "Current", color: "var(--color-primary)", style: "solid" },
        { key: "previous", label: "Reference", color: "#4f7fa8", style: "dashed" },
      ],
    },
    {
      match: /revenue by branch/i,
      xLabel: "Revenue (₹Cr)",
      yLabel: "Branch",
      legend: [{ key: "bar", label: "Revenue", color: "var(--color-primary)", style: "bar" }],
    },
    {
      match: /revenue by service line/i,
      xLabel: "Service line",
      yLabel: "Revenue (₹Cr)",
      legend: [{ key: "bar", label: "Revenue", color: "var(--color-primary)", style: "bar" }],
    },
    {
      match: /payor mix/i,
      xLabel: "Revenue share",
      yLabel: "Payor mix",
      legend: [{ key: "share", label: "Payor share", color: "var(--color-chart-2)", style: "bar" }],
    },
  ];

  const globalControls = [
    {
      kind: "branch",
      match: new RegExp(["All Network Branches", ...zyephrBranchNames].map(regExpEscape).join("|")),
      options: ["All Network Branches", ...zyephrBranchNames],
    },
    {
      kind: "timeframe",
      match: /Today|Last 7 days|Last 30 days|Quarter to date|Year to date/,
      options: ["Today", "Last 7 days", "Last 30 days", "Quarter to date", "Year to date"],
    },
  ];
  const globalComparisonPattern = /^(vs\. Yesterday|vs\. Previous period|vs\. Target|vs\. Same period LY|No comparison)$/;

  const subpagePresentation = {
    "/branches": { title: "Branch Comparison" },
    "/finance": { title: "Financial Performance" },
    "/capacity-flow": { title: "Capacity & Patient Flow" },
    "/dialysis-program": { title: "Dialysis Program" },
    "/operations": { title: "Operations" },
    "/revenue-cycle-ops": { title: "Revenue Cycle Operations" },
    "/hrms": { title: "HRMS" },
    "/reports": { title: "Reports Library" },
  };

  const ceoOnlyRoutes = new Set(["/finance", "/capacity-flow"]);
  const cooOnlyRoutes = new Set(["/operations", "/revenue-cycle-ops"]);
  const roleRouteEquivalent = {
    CEO: {
      "/operations": "/capacity-flow",
      "/revenue-cycle-ops": "/finance",
    },
    COO: {
      "/finance": "/branches",
      "/capacity-flow": "/operations",
    },
    HR_ADMIN: {
      "/overview": "/hrms?role=HR_ADMIN",
      "/finance": "/hrms?role=HR_ADMIN",
      "/branches": "/hrms?role=HR_ADMIN",
      "/capacity-flow": "/hrms?role=HR_ADMIN",
      "/operations": "/hrms?role=HR_ADMIN",
      "/revenue-cycle-ops": "/hrms?role=HR_ADMIN",
      "/dialysis-program": "/hrms?role=HR_ADMIN",
    },
  };
  const overviewDrilldowns = {
    CEO: [
      { match: /revenue/i, route: "/finance?tab=revenue-analysis" },
      { match: /ebitda/i, route: "/finance?tab=ebitda-margin" },
      { match: /occupancy|bed occupancy/i, route: "/capacity-flow?tab=occupancy" },
      { match: /alos/i, route: "/capacity-flow?tab=alos" },
    ],
    COO: [
      { match: /dialysis/i, route: "/dialysis-program?tab=utilization" },
      { match: /billing|payer|claim|collection/i, route: "/revenue-cycle-ops?tab=discharge-billing" },
      { match: /opd/i, route: "/operations?tab=patient-flow&focus=opd" },
      { match: /ipd|admission/i, route: "/operations?tab=patient-flow&focus=ipd" },
      { match: /discharge|tat/i, route: "/operations?tab=discharge-flow" },
      { match: /occupancy|bed/i, route: "/operations?tab=bed-capacity" },
      { match: /surgery|procedure/i, route: "/operations?tab=procedures" },
      { match: /staff/i, route: "/operations?tab=staffing" },
    ],
  };
  const overviewRoleViews = {
    CEO: {
      route: "/overview",
      title: "Network performance overview",
      detailRoute: "/finance",
      attentionRoute: "/branches",
      readyTitle: /network performance overview/i,
    },
    COO: {
      route: "/overview",
      title: "Operations overview",
      detailRoute: "/operations",
      attentionRoute: "/operations",
      readyTitle: /operations overview/i,
    },
  };
  const routeWorkflowLabels = {
    "/branches": "Branch detail",
    "/finance": "Financial drilldown",
    "/capacity-flow": "Capacity drilldown",
    "/operations": "Operational queue",
    "/revenue-cycle-ops": "Blocker queue",
    "/dialysis-program": "Dialysis drilldown",
    "/hrms": "HRMS workflow",
    "/reports": "Report job",
  };
  const globalShellPages = [
    { id: "overview", route: "/overview", label: "Overview", icon: "dashboard", roles: ["CEO", "COO"], order: { CEO: 0, COO: 0 } },
    { id: "finance", route: "/finance", label: "Finance", icon: "finance", roles: ["CEO"], order: { CEO: 1 } },
    { id: "branches-ceo", route: "/branches", label: "Branches", icon: "branch", tab: "performance", roles: ["CEO"], order: { CEO: 2 } },
    { id: "capacity-flow", route: "/capacity-flow", label: "Capacity & Flow", icon: "capacity", roles: ["CEO"], order: { CEO: 3 } },
    { id: "dialysis-program-ceo", route: "/dialysis-program", label: "Dialysis Program", icon: "dialysis", roles: ["CEO"], order: { CEO: 4 } },
    { id: "operations", route: "/operations", label: "Operations", icon: "operations", roles: ["COO"], order: { COO: 1 } },
    { id: "dialysis-program-coo", route: "/dialysis-program", label: "Dialysis Program", icon: "dialysis", roles: ["COO"], order: { COO: 2 } },
    { id: "revenue-cycle-ops", route: "/revenue-cycle-ops", label: "Revenue Cycle Ops", icon: "queue", roles: ["COO"], order: { COO: 3 } },
    { id: "branches-coo", route: "/branches", label: "Branches", icon: "branch", tab: "ops-ranking", roles: ["COO"], order: { COO: 4 } },
    { id: "hrms-overview", route: "/hrms", label: "Overview", icon: "dashboard", tab: "overview", roles: ["HR_ADMIN"], order: { HR_ADMIN: 0 } },
    { id: "hrms-staff", route: "/hrms", label: "Staff", icon: "users", tab: "staff", roles: ["HR_ADMIN"], order: { HR_ADMIN: 1 } },
    { id: "hrms-departments", route: "/hrms", label: "Departments", icon: "building", tab: "departments", roles: ["HR_ADMIN"], order: { HR_ADMIN: 2 } },
    { id: "hrms-access", route: "/hrms", label: "Roles & Access", icon: "shield", tab: "access", roles: ["HR_ADMIN"], order: { HR_ADMIN: 3 } },
    { id: "reports-ceo", route: "/reports", label: "Reports", icon: "file", roles: ["CEO"], order: { CEO: 5 } },
    { id: "reports-coo", route: "/reports", label: "Reports", icon: "file", roles: ["COO"], order: { COO: 5 } },
    { id: "reports-hr", route: "/reports", label: "Reports", icon: "file", roles: ["HR_ADMIN"], order: { HR_ADMIN: 4 } },
  ];

  function personaSidebarItemsFor(role) {
    return globalShellPages
      .filter((item) => item.roles.includes(role))
      .sort((a, b) => (a.order[role] ?? 99) - (b.order[role] ?? 99))
      .map(({ route, label, icon, tab }) => ({ route, label, icon, tab }));
  }

  const ceoOnlyBranchTabs = new Set(["performance", "financial-contribution", "risk"]);
  const cooOnlyBranchTabs = new Set(["ops-ranking", "patient-flow", "dialysis", "staffing"]);
  const sharedBranchTabs = new Set(["capacity", "service-performance", "branch-detail"]);

  const revenueLensFocuses = ["Department", "Unit", "Doctor", "Demographics"];
  const revenueLensPaths = new Set([]);

  const revenueLensDataset = zyephrDerived?.revenueLensDataset || {
    CEO: {
      title: "Revenue Lens",
      description: "Segment network revenue by department, unit, doctor, and patient mix.",
      context: "Best placed here because it is a cross-network drilldown from the executive revenue KPI.",
      metrics: [
        { label: "Lab visit %", value: "23.5%", delta: "+1.8pp", tone: "good" },
        { label: "Day gap", value: "34.7d", delta: "-2.1d", tone: "good" },
        { label: "Revenue / visit", value: "₹279", delta: "+6.4%", tone: "good" },
      ],
      insight: {
        label: "CEO focus",
        text: "In-centre dialysis and nephrology OPD carry the largest revenue pool, while renal ICU is the fastest mover.",
      },
      Department: [
        { name: "In-centre dialysis", value: 9.8, sub: "₹197M · 41% female" },
        { name: "Nephrology OPD", value: 9.4, sub: "₹190M · 38% female" },
        { name: "Renal ICU", value: 6.8, sub: "₹126M · strong repeat mix" },
        { name: "Kidney transplant workup", value: 5.9, sub: "+8.7% vs prior period" },
        { name: "Vascular access procedures", value: 4.8, sub: "procedure-led growth" },
      ],
      Unit: [
        { name: "Westside", value: 9.8, sub: "best network revenue" },
        { name: "Eastview", value: 8.7, sub: "balanced payor mix" },
        { name: "Northgate", value: 7.6, sub: "high outpatient lift" },
        { name: "Southpoint", value: 6.1, sub: "watch ALOS drag" },
        { name: "Central", value: 5.4, sub: "margin pressure" },
      ],
      Doctor: [
        { name: "Dr. Rao", value: 4.9, sub: "in-centre dialysis" },
        { name: "Dr. Mehta", value: 4.5, sub: "nephrology OPD" },
        { name: "Dr. Iyer", value: 4.1, sub: "renal ICU" },
        { name: "Dr. Kapoor", value: 3.7, sub: "transplant workup" },
        { name: "Dr. Nair", value: 3.4, sub: "vascular access" },
      ],
      Demographics: [
        { name: "Female · 31-45", value: 8.4, sub: "highest visit frequency" },
        { name: "Male · 46-60", value: 7.9, sub: "procedure-heavy mix" },
        { name: "Female · 46-60", value: 6.8, sub: "strong diagnostics attach" },
        { name: "Male · 31-45", value: 5.7, sub: "OPD-led growth" },
        { name: "Senior · 60+", value: 5.2, sub: "care-plan retention" },
      ],
      timeline: [42, 41, 43, 45, 40, 44, 48, 47, 43, 49, 42, 45],
    },
    COO: {
      title: "Revenue Lens",
      description: "Connect revenue movement to operational units, doctors, departments, and patient mix.",
      context: "For COO, this belongs on Overview as the operational bridge between volume, flow, and revenue quality.",
      metrics: [
        { label: "Lab visit %", value: "22.1%", delta: "+0.9pp", tone: "good" },
        { label: "Day gap", value: "32.4d", delta: "-1.4d", tone: "good" },
        { label: "Revenue / visit", value: "₹263", delta: "+3.8%", tone: "good" },
      ],
      insight: {
        label: "COO focus",
        text: "OPD conversion is healthy, but Central and Riverside need cleaner doctor roster and discharge-to-billing handoffs.",
      },
      Department: [
        { name: "Nephrology OPD", value: 8.6, sub: "highest visit volume" },
        { name: "In-centre dialysis", value: 7.9, sub: "schedule adherence driver" },
        { name: "Renal ICU", value: 7.4, sub: "acuity conversion" },
        { name: "Renal diagnostics", value: 5.8, sub: "lab attach rate watch" },
        { name: "Vascular access procedures", value: 4.9, sub: "procedure utilization driver" },
      ],
      Unit: [
        { name: "OPD", value: 8.4, sub: "front-door conversion" },
        { name: "Dialysis", value: 7.8, sub: "missed session sensitivity" },
        { name: "IPD", value: 7.2, sub: "bed-flow dependency" },
        { name: "Access procedures", value: 6.5, sub: "procedure start-time impact" },
        { name: "Renal diagnostics", value: 4.6, sub: "lab visit attach" },
      ],
      Doctor: [
        { name: "Dr. Menon", value: 4.2, sub: "dialysis program" },
        { name: "Dr. Rao", value: 4.0, sub: "renal ICU" },
        { name: "Dr. Sinha", value: 3.8, sub: "CKD clinic" },
        { name: "Dr. Bose", value: 3.3, sub: "renal diagnostics referrals" },
        { name: "Dr. Nair", value: 3.1, sub: "vascular access" },
      ],
      Demographics: [
        { name: "Chronic care", value: 7.8, sub: "repeat scheduling" },
        { name: "Senior · 60+", value: 6.9, sub: "IPD and dialysis mix" },
        { name: "Female · 31-45", value: 5.9, sub: "diagnostics attach" },
        { name: "Male · 46-60", value: 5.4, sub: "procedure conversion" },
        { name: "New patients", value: 4.8, sub: "front desk throughput" },
      ],
      timeline: [38, 40, 39, 42, 41, 43, 44, 42, 45, 46, 43, 44],
    },
  };

  const financeDrilldownFields = ["Department", "Center", "Doctor Name", "Demographics", "Year"];
  const financeDrilldownFilters = zyephrDerived?.financeDrilldownFilters || {
    yearMonth: ["All", "2026", "2025", "2024"],
    monthYear: ["All", "Jun 2026", "May 2026", "Apr 2026"],
    department: ["All", "Nephrology OPD", "In-centre dialysis", "Renal ICU", "Renal diagnostics"],
    doctor: ["All", "Dr. Rao", "Dr. Mehta", "Dr. Iyer", "Dr. Menon"],
    centre: ["All", "Westside", "Eastview", "Central", "Riverside"],
  };
  const financeDrilldownFilterLabels = {
    yearMonth: "Year, Month",
    monthYear: "Month, Year",
    department: "Department",
    doctor: "Doctor name",
    centre: "Center name",
  };
  const financeDrilldownData = zyephrDerived?.financeDrilldownData || {
    Department: [
      { label: "In-centre dialysis", total: 48, female: 19, male: 25, unmapped: 4 },
      { label: "Nephrology OPD", total: 44, female: 16, male: 24, unmapped: 4 },
      { label: "Renal ICU", total: 41, female: 20, male: 18, unmapped: 3 },
      { label: "Kidney transplant workup", total: 32, female: 12, male: 18, unmapped: 2 },
      { label: "Vascular access procedures", total: 27, female: 9, male: 16, unmapped: 2 },
      { label: "Renal diagnostics", total: 24, female: 10, male: 12, unmapped: 2 },
      { label: "Pharmacy & ESA therapy", total: 21, female: 12, male: 8, unmapped: 1 },
      { label: "Home dialysis / CAPD", total: 17, female: 8, male: 8, unmapped: 1 },
      { label: "CKD clinic", total: 14, female: 5, male: 8, unmapped: 1 },
      { label: "Transplant follow-up", total: 12, female: 3, male: 8, unmapped: 1 },
    ],
    Center: [
      { label: "Westside", total: 98, female: 39, male: 52, unmapped: 7 },
      { label: "Eastview", total: 87, female: 33, male: 48, unmapped: 6 },
      { label: "Northgate", total: 76, female: 30, male: 41, unmapped: 5 },
      { label: "Southpoint", total: 61, female: 24, male: 33, unmapped: 4 },
      { label: "Central", total: 54, female: 20, male: 31, unmapped: 3 },
      { label: "Riverside", total: 52, female: 19, male: 30, unmapped: 3 },
    ],
    "Doctor Name": [
      { label: "Dr. Rao", total: 24, female: 9, male: 13, unmapped: 2 },
      { label: "Dr. Mehta", total: 22, female: 9, male: 12, unmapped: 1 },
      { label: "Dr. Iyer", total: 19, female: 7, male: 11, unmapped: 1 },
      { label: "Dr. Kapoor", total: 17, female: 8, male: 8, unmapped: 1 },
      { label: "Dr. Menon", total: 16, female: 6, male: 9, unmapped: 1 },
      { label: "Dr. Nair", total: 14, female: 5, male: 8, unmapped: 1 },
      { label: "Dr. Bose", total: 11, female: 4, male: 6, unmapped: 1 },
    ],
    Demographics: [
      { label: "Female · 31-45", total: 37, female: 33, male: 2, unmapped: 2 },
      { label: "Male · 46-60", total: 34, female: 2, male: 30, unmapped: 2 },
      { label: "Female · 46-60", total: 29, female: 26, male: 1, unmapped: 2 },
      { label: "Male · 31-45", total: 27, female: 1, male: 24, unmapped: 2 },
      { label: "Senior · 60+", total: 24, female: 10, male: 12, unmapped: 2 },
      { label: "New patients", total: 18, female: 8, male: 8, unmapped: 2 },
    ],
    Year: [
      { label: "2026", total: 428, female: 170, male: 232, unmapped: 26 },
      { label: "2025", total: 402, female: 159, male: 219, unmapped: 24 },
      { label: "2024", total: 361, female: 142, male: 199, unmapped: 20 },
      { label: "2023", total: 314, female: 125, male: 172, unmapped: 17 },
      { label: "2022", total: 276, female: 109, male: 151, unmapped: 16 },
    ],
  };
  const financeDrilldownTrend = zyephrDerived?.financeTrend || [
    { label: "Jan 2025", revenue: 42, prev: -2.3, same: 8.7 },
    { label: "Feb", revenue: 41, prev: -11.5, same: -1.8 },
    { label: "Mar", revenue: 45, prev: 9.4, same: -17.8 },
    { label: "Apr", revenue: 45, prev: 26.3, same: 3.2 },
    { label: "May", revenue: 40, prev: -8.4, same: 9.9 },
    { label: "Jun", revenue: 43, prev: 6.9, same: -17.5 },
    { label: "Jul", revenue: 36, prev: -56.0, same: 3.6 },
    { label: "Aug", revenue: 45, prev: 0.2, same: -1.8 },
    { label: "Sep", revenue: 48, prev: -1.2, same: -0.3 },
    { label: "Oct", revenue: 47, prev: -11.5, same: -3.4 },
    { label: "Nov", revenue: 43, prev: -26.6, same: 13.5 },
    { label: "Dec", revenue: 49, prev: -14.5, same: -9.8 },
    { label: "Jan 2026", revenue: 42, prev: 5.8, same: -4.4 },
    { label: "Feb", revenue: 38, prev: -4.2, same: 6.2 },
    { label: "Mar", revenue: 40, prev: 1.6, same: -2.0 },
    { label: "Apr", revenue: 38, prev: -62.3, same: 5.1 },
    { label: "May", revenue: 41, prev: 4.8, same: -1.4 },
    { label: "Jun", revenue: 43, prev: 6.4, same: 2.6 },
  ];

  function currentPath() {
    return window.location.pathname.replace(/\/$/, "") || "/";
  }

  function storedRole() {
    try {
      return normalizeRole(window.localStorage.getItem("zyephr.role"));
    } catch {
      return null;
    }
  }

  function explicitRoleParam() {
    return normalizeRole(new URLSearchParams(window.location.search).get("role"));
  }

  function branchRoleFromTab(tab) {
    if (cooOnlyBranchTabs.has(tab)) return "COO";
    if (ceoOnlyBranchTabs.has(tab)) return "CEO";
    return null;
  }

  function roleFromPath(path = currentPath()) {
    const tab = new URLSearchParams(window.location.search).get("tab") || "";
    if (path === "/hrms") return "HR_ADMIN";
    if (path === "/branches") return explicitRoleParam() || branchRoleFromTab(tab);
    if (cooOnlyRoutes.has(path)) return "COO";
    if (ceoOnlyRoutes.has(path)) return "CEO";
    return null;
  }

  function roleFromShell() {
    const profileText = Array.from(document.querySelectorAll("aside button, header button"))
      .map((button) => button.textContent.replace(/\s+/g, " ").trim())
      .find((text) => /(Sarah Chen|HR Admin|All Branches|HRMS)/i.test(text) && /\b(COO|CEO|HR Admin)\b/i.test(text));

    if (/\bHR Admin\b/i.test(profileText || "")) return "HR_ADMIN";
    if (/\bCOO\b/i.test(profileText || "")) return "COO";
    if (/\bCEO\b/i.test(profileText || "")) return "CEO";
    return null;
  }

  function activeRole() {
    const explicitRole = explicitRoleParam();
    if (explicitRole) return explicitRole;
    const rememberedRole = storedRole();
    if (rememberedRole) return rememberedRole;
    if (currentPath() === "/branches" && !roleFromPath()) {
      return roleFromShell() || "CEO";
    }
    return roleFromPath() || roleFromShell() || "CEO";
  }

  function roleRouteFor(path, role) {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab") || "";

    if (role === "COO" && path === "/finance") {
      if (tab === "payor-collections") return "/revenue-cycle-ops?tab=claims-aging";
      return "/branches?tab=service-performance";
    }

    if (role === "CEO" && path === "/revenue-cycle-ops") {
      return tab === "discharge-billing" ? "/finance?tab=payor-collections" : "/finance?tab=payor-collections";
    }

    if (role === "HR_ADMIN" && path !== "/hrms" && path !== "/reports") {
      return "/hrms?role=HR_ADMIN";
    }

    return roleRouteEquivalent[role]?.[path] || path;
  }

  function enforceRouteAccess() {
    const path = currentPath();
    const explicitRole = explicitRoleParam();
    const pathRole =
      path === "/hrms"
        ? "HR_ADMIN"
        : cooOnlyRoutes.has(path)
          ? "COO"
          : ceoOnlyRoutes.has(path)
            ? "CEO"
            : null;
    const role = explicitRole || storedRole() || pathRole || roleFromShell() || "CEO";
    const equivalent = roleRouteFor(path, role);
    const target = new URL(equivalent, window.location.origin);
    if (target.pathname === path && !target.search) {
      new URLSearchParams(window.location.search).forEach((value, key) => {
        target.searchParams.set(key, value);
      });
    }
    if (role) target.searchParams.set("role", role);
    const targetHasQuery = target.search.length > 0;
    if (target.pathname !== path || (targetHasQuery && target.search !== window.location.search)) {
      const targetHref = urlString(target);
      if (target.pathname === "/hrms" || path === "/hrms") {
        window.location.assign(targetHref);
        return true;
      }
      window.history.replaceState({}, "", targetHref);
      scheduleEnhance();
      return true;
    }
    return false;
  }

  function persistRole(role) {
    try {
      window.localStorage.setItem("zyephr.role", role);
    } catch {
      // Ignore storage issues in static preview.
    }
  }

  function urlString(url) {
    return `${url.pathname}?${url.searchParams.toString()}`.replace(/\?$/, "");
  }

  function roleAwareUrl(pathOrUrl, role) {
    const url = new URL(pathOrUrl, window.location.origin);
    url.searchParams.set("role", role);
    return urlString(url);
  }

  function activeRoleAwareUrl(pathOrUrl) {
    return roleAwareUrl(pathOrUrl, activeRole());
  }

  function roleSwitchDestination(role) {
    if (role === "HR_ADMIN") return roleProfiles.HR_ADMIN.home;

    const path = currentPath();
    if (path === "/" || path === "/hrms") return roleProfiles[role]?.home || roleProfiles.CEO.home;

    const equivalent = roleRouteFor(path, role);
    const target = new URL(equivalent, window.location.origin);
    const routeAllowed = target.pathname === "/overview" || Boolean(v2RouteConfig(role, target.pathname));
    if (!routeAllowed) return roleProfiles[role]?.home || roleProfiles.CEO.home;

    if (target.pathname === "/branches" && !target.searchParams.has("tab")) {
      target.searchParams.set("tab", role === "COO" ? "ops-ranking" : "performance");
    }

    target.searchParams.set("role", role);
    return urlString(target);
  }

  function switchRole(role) {
    const nextRole = normalizeRole(role) || "CEO";
    const destination = roleSwitchDestination(nextRole);
    persistRole(nextRole);
    closeRoleProfileMenu();
    if (nextRole === "HR_ADMIN" || currentPath() === "/hrms" || currentPath() === "/overview") {
      window.location.assign(destination);
      return;
    }
    trustPersonaNavigation(new URL(destination, window.location.origin), nextRole);
    window.history.pushState({}, "", destination);
    scheduleEnhance();
  }

  function mainPageContainer() {
    return document.querySelector("main .mx-auto.w-full") || document.querySelector("main > div");
  }

  function findCardTitle(card) {
    const titleCandidates = card.querySelectorAll(
      ".text-\\[13px\\].font-semibold, .text-\\[14px\\].font-semibold, [class*='font-semibold']",
    );

    return [...titleCandidates].find((node) => {
      const text = node.textContent.trim();
      return text.length > 0 && text.length <= 90;
    });
  }

  function enhanceBranding() {
    const brandBar = document.querySelector("aside > div:first-child");
    const brandText = brandBar?.querySelector("span");
    const brandLogo = brandBar?.querySelector("div");

    if (brandText && brandText.textContent !== "ZyephrOS") {
      brandText.textContent = "ZyephrOS";
    }

    if (brandLogo) {
      brandLogo.setAttribute("aria-label", "ZyephrOS");
      brandLogo.setAttribute("title", "ZyephrOS");
    }

    if (document.title.includes("Zyephr OS")) {
      document.title = document.title.replace("Zyephr OS", "ZyephrOS");
    }
  }

  function normalizeSubpageIntro() {
    const page = subpagePresentation[currentPath()];
    if (!page) return;

    const container = mainPageContainer();
    const title = container?.querySelector("h1") || document.querySelector("main h1");
    const intro = title?.closest("div");
    if (!title) return;

    const eyebrowCandidates = [
      ...(intro?.querySelectorAll("div, p, span") || []),
      ...(container?.querySelectorAll("div, p, span") || []),
    ];
    const eyebrow = eyebrowCandidates.find((node) => {
      const text = node.textContent.replace(/\s+/g, " ").trim();
      return text && text.length <= 40 && /network|quality|library|operations/i.test(text);
    });

    if (eyebrow && !eyebrow.hidden) {
      eyebrow.hidden = true;
    }

    if (title.textContent !== page.title) {
      title.textContent = page.title;
    }

    const desiredDocumentTitle = `${page.title} · ZyephrOS`;
    if (document.title !== desiredDocumentTitle) {
      document.title = desiredDocumentTitle;
    }
  }

  function setNavLabel(link, label) {
    const textNode = [...link.querySelectorAll("span, div")].reverse().find((node) => {
      const text = node.textContent.replace(/\s+/g, " ").trim();
      return text && !/^[A-Z]{1,3}$/.test(text);
    });
    if (textNode) {
      textNode.textContent = label;
    } else {
      link.setAttribute("aria-label", label);
    }
  }

  function routeFromSidebarLink(link) {
    const href = link.getAttribute("href") || "";
    const path = href.startsWith("/") ? href.split("?")[0] : "";
    const text = link.textContent.replace(/\s+/g, " ").trim().toLowerCase();
    if (path && globalShellPages.some((item) => item.route === path)) return path;
    if (text.includes("overview")) return "/overview";
    if (text.includes("branch")) return "/branches";
    if (text.includes("revenue cycle")) return "/revenue-cycle-ops";
    if (text.includes("hrms") || text.includes("staff")) return "/hrms";
    if (text.includes("finance")) return "/finance";
    if (text.includes("operation")) return "/operations";
    if (text.includes("capacity")) return "/capacity-flow";
    if (text.includes("dialysis")) return "/dialysis-program";
    if (text.includes("quality")) return null;
    if (text.includes("report")) return "/reports";
    return "";
  }

  const hrmsSidebarItems = [
    { tab: "overview", label: "Overview", icon: "dashboard" },
    { tab: "staff", label: "Staff", icon: "users" },
    { tab: "departments", label: "Departments", icon: "building" },
    { tab: "access", label: "Roles & Access", icon: "shield" },
    { href: "/reports?role=HR_ADMIN", label: "Reports", icon: "file" },
  ];

  function hrmsSidebarIcon(type) {
    const paths = {
      dashboard: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
      finance: '<path d="M6 3h12"/><path d="M6 8h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3"/><path d="M9 13c6.7 0 6.7-10 0-10"/>',
      branch: '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><path d="M11 18H8a2 2 0 0 1-2-2V9"/>',
      capacity: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
      dialysis: '<path d="M7 16.3c2.2 0 4-1.8 4-4.1 0-1.1-.6-2.2-1.7-3.1S7.3 6.8 7 5.3c-.3 1.5-1.1 2.8-2.3 3.8S3 11.1 3 12.3c0 2.2 1.8 4 4 4Z"/><path d="M12.6 6.6A11 11 0 0 0 14 3c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a7 7 0 0 1-11.9 5"/>',
      operations: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/><path d="M8 6v12"/><path d="M16 6v12"/>',
      queue: '<path d="M7 7h10"/><path d="M7 12h10"/><path d="M7 17h7"/><path d="M4 7h0"/><path d="M4 12h0"/><path d="M4 17h0"/>',
      users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
      building: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
      "user-plus": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>',
      fingerprint: '<path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 10 10"/><path d="M6 12a6 6 0 0 1 12 0"/><path d="M10 12a2 2 0 0 1 4 0c0 2.5-.8 4.8-2.2 6.7"/><path d="M7.8 17.8A10 10 0 0 0 10 22"/><path d="M14.7 20.2A14 14 0 0 0 18 12"/><path d="M4 16a14 14 0 0 0 1.2 2.8"/>',
      sliders: '<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M2 14h4"/><path d="M10 8h4"/><path d="M18 16h4"/>',
      sort: '<path d="m7 3-4 4 4 4"/><path d="M3 7h18"/><path d="m17 21 4-4-4-4"/><path d="M21 17H3"/>',
      shield: '<path d="M20 13c0 5-3.5 7.5-7.7 8.9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.5a1.3 1.3 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
      "chevron-left": '<path d="m15 18-6-6 6-6"/>',
      "chevron-right": '<path d="m9 18 6-6-6-6"/>',
      file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v6h6"/><path d="M10 13h4"/><path d="M10 17h4"/><path d="M8 13h.01"/><path d="M8 17h.01"/>',
    };
    return `<svg class="lucide h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[type] || paths.file}</svg>`;
  }

  function normalizeHrmsTab(tab) {
    const value = tab || "overview";
    if (value === "staff-directory" || value === "onboarding" || value === "biometrics") return "staff";
    return value;
  }

  function hrmsPageMeta(tab) {
    const active = normalizeHrmsTab(tab);
    const meta = {
      overview: ["HRMS Overview", "Manage staff status, onboarding blockers, department staffing, and HR access controls."],
      staff: ["Staff", "Manage staff records, onboarding progress, and biometric enrollment in one workflow."],
      departments: ["Departments", "Manage department heads, staffing coverage, and open roles."],
      access: ["Roles & Access", "Control HRMS permissions without exposing finance, operations, or patient data."],
    };
    const [title, description] = meta[active] || meta.overview;
    return { title, description };
  }

  function ensureHrmsSidebar() {
    const aside = document.querySelector("aside");
    const nav = aside?.querySelector("nav");
    if (!nav) return;

    const params = new URLSearchParams(window.location.search);
    const activeTab = normalizeHrmsTab(params.get("tab"));
    const path = currentPath();

    nav.className = "flex-1 px-3 py-4 space-y-0.5 overflow-y-auto";
    nav.innerHTML = hrmsSidebarItems
      .map((item) => {
        const href = item.href || `/hrms?role=HR_ADMIN&tab=${encodeURIComponent(item.tab)}`;
        const active = item.href ? path === "/reports" : path === "/hrms" && activeTab === item.tab;
        const className = `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-colors duration-200 ${active ? "bg-primary-soft text-primary active" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`;
        return `<a class="${className}" href="${href}" ${active ? 'aria-current="page"' : ""}>${hrmsSidebarIcon(item.icon)}<span>${item.label}</span></a>`;
      })
      .join("");
  }

  function sidebarItemHref(item, role) {
    const url = new URL(item.route, window.location.origin);
    if (item.tab) url.searchParams.set("tab", item.tab);
    url.searchParams.set("role", role);
    return urlString(url);
  }

  function sidebarItemActive(item, role) {
    const path = currentPath();
    if (path !== item.route) return false;
    if (role === "HR_ADMIN" && item.route === "/hrms") {
      return normalizeHrmsTab(v2Params().get("tab")) === item.tab;
    }
    return true;
  }

  function sidebarItemMarkup(item, role) {
    const active = sidebarItemActive(item, role);
    const className = `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-colors duration-200 ${active ? "bg-primary-soft text-primary active" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`;
    return `<a class="${className}" href="${escapeHtml(sidebarItemHref(item, role))}" data-persona-nav="${escapeHtml(item.route)}" ${active ? 'aria-current="page"' : ""}>${hrmsSidebarIcon(item.icon)}<span>${escapeHtml(item.label)}</span></a>`;
  }

  function enhanceSidebarForRole() {
    const role = activeRole();
    const nav = document.querySelector("aside nav");
    const items = personaSidebarItemsFor(role);
    if (!nav) {
      updateProfileShell(role);
      return;
    }

    const signature = `${role}|${currentPath()}|${v2Params().get("tab") || ""}`;
    if (nav.dataset.personaSidebarSignature !== signature) {
      nav.className = "flex-1 px-3 py-4 space-y-0.5 overflow-y-auto";
      nav.innerHTML = items.map((item) => sidebarItemMarkup(item, role)).join("");
      nav.dataset.personaSidebarSignature = signature;
    }

    updateProfileShell(role);
  }

  function profileButton() {
    return [...document.querySelectorAll("aside button")].find((button) =>
      /Sarah Chen|HR Admin|All Branches|HRMS|CEO|COO/i.test(button.textContent),
    );
  }

  function updateProfileShell(role) {
    const profile = profileButton();
    const data = roleProfiles[role] || roleProfiles.CEO;
    if (!profile) return;

    const textNodes = [...profile.querySelectorAll("span, div, p")].filter((node) => node.childElementCount === 0);
    const nameNode = textNodes.find((node) => /Sarah Chen|HR Admin/i.test(node.textContent));
    const roleNode = textNodes.find((node) => /\b(CEO|COO|HR Admin)\b/i.test(node.textContent) || /All Branches|HRMS/i.test(node.textContent));
    const avatarNode = textNodes.find((node) => /^(SC|HR)$/i.test(node.textContent.trim()));

    if (nameNode) nameNode.textContent = data.name;
    if (roleNode) roleNode.textContent = `${data.role} · ${data.scope}`;
    if (avatarNode) avatarNode.textContent = data.initials;

    profile.setAttribute("aria-label", `Switch role. Current role: ${data.role}`);
    profile.dataset.roleProfile = "true";
  }

  function closeRoleProfileMenu() {
    document.querySelectorAll(".role-profile-menu").forEach((menu) => menu.remove());
    document.querySelectorAll("aside button[data-role-profile='true'][aria-expanded='true']").forEach((button) => {
      button.setAttribute("aria-expanded", "false");
    });
  }

  function bindRoleProfileMenu() {
    const profile = profileButton();
    if (!profile || profile.dataset.roleProfileBound === "true") return;

    profile.dataset.roleProfileBound = "true";
    profile.setAttribute("aria-haspopup", "menu");
    profile.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const existing = profile.parentElement?.querySelector(":scope > .role-profile-menu");
      if (existing) {
        closeRoleProfileMenu();
        return;
      }

      closeRoleProfileMenu();
      const menu = document.createElement("div");
      menu.className = "role-profile-menu";
      menu.setAttribute("role", "menu");
      for (const [role, data] of Object.entries(roleProfiles)) {
        const item = document.createElement("button");
        item.type = "button";
        item.setAttribute("role", "menuitemradio");
        item.setAttribute("aria-checked", String(activeRole() === role));
        item.innerHTML = `<strong>${escapeHtml(data.name)}</strong><span>${escapeHtml(data.role)} · ${escapeHtml(data.scope)}</span>`;
        item.addEventListener("click", (menuEvent) => {
          menuEvent.preventDefault();
          menuEvent.stopPropagation();
          switchRole(role);
        });
        menu.appendChild(item);
      }
      profile.parentElement?.appendChild(menu);
      profile.setAttribute("aria-expanded", "true");
    });
  }

  function enhanceRoleShell() {
    document.querySelectorAll(".role-switcher").forEach((node) => node.remove());
    try {
      const explicitRole = explicitRoleParam();
      const routeRole = roleFromPath();
      if (explicitRole) {
        window.localStorage.setItem("zyephr.role", explicitRole);
      } else if (!storedRole() && routeRole) {
        window.localStorage.setItem("zyephr.role", routeRole);
      }
    } catch {
      // Role is derived from the profile/sidebar shell.
    }
    enhanceSidebarForRole();
    bindRoleProfileMenu();
  }

  function isMetricsStrip(element) {
    return Boolean(
      element?.className?.includes("rounded-2xl") &&
        element.className.includes("overflow-hidden") &&
        element.querySelector(":scope > .grid.divide-x"),
    );
  }

  function isSubpageTabs(element) {
    return Boolean(
      element?.className?.includes("border-b") &&
        element.className.includes("border-border") &&
        element.querySelector("button"),
    );
  }

  function normalizeSubpageLayout() {
    if (!subpagePresentation[currentPath()]) return;

    const container = mainPageContainer();
    if (!container) return;

    const children = [...container.children];
    const metrics = children.find(isMetricsStrip);
    const tabs = children.find(isSubpageTabs);
    if (!metrics || !tabs) return;

    if (tabs.compareDocumentPosition(metrics) & Node.DOCUMENT_POSITION_FOLLOWING) {
      metrics.insertAdjacentElement("afterend", tabs);
    }
  }

  function getChartMeta(title, card) {
    const explicitMeta = chartMeta.find((item) => item.match.test(title));
    if (explicitMeta) return explicitMeta;

    const svg = card.querySelector(".recharts-wrapper svg");
    if (!svg) return null;

    if (svg.querySelector("path.recharts-line-curve")) {
      return {
        xLabel: "Time period",
        yLabel: "Metric",
        legend: [
          { key: "current", label: "Primary series", color: "var(--color-primary)", style: "solid" },
          { key: "previous", label: "Reference series", color: "var(--color-muted-foreground)", style: "dashed" },
        ],
      };
    }

    if (svg.querySelector("path.recharts-rectangle")) {
      return {
        xLabel: "Metric",
        yLabel: "Category",
        legend: [{ key: "bar", label: title, color: "var(--color-primary)", style: "bar" }],
      };
    }

    if (svg.querySelector(".recharts-sector")) {
      return {
        xLabel: "Share of total",
        yLabel: "Category",
        legend: [{ key: "share", label: title, color: "var(--color-chart-2)", style: "bar" }],
      };
    }

    return null;
  }

  function previousComparisonLabel() {
    if (appState.comparison === "vs. Yesterday") return "Yesterday";
    if (appState.comparison === "vs. Same period LY") return "Same period LY";
    if (appState.comparison === "vs. Target") return "Target comparison";
    return "Previous period";
  }

  function currentComparisonLegend(meta) {
    return meta.legend.map((item) => {
      if (item.key !== "previous") return item;
      return { ...item, label: previousComparisonLabel() };
    });
  }

  function createLegendItem(item) {
    const legendItem = document.createElement("span");
    legendItem.className = "chart-legend-item";
    legendItem.dataset.legendKey = item.key || item.label;

    const mark = document.createElement("span");
    mark.className = `chart-legend-mark chart-legend-mark--${item.style}`;
    mark.style.setProperty("--legend-color", item.color);

    const label = document.createElement("span");
    label.className = "chart-legend-label";
    label.textContent = item.label;

    legendItem.append(mark, label);
    return legendItem;
  }

  function renderLegend(row, meta) {
    let legend = row.querySelector(".chart-legend");
    if (!legend) {
      legend = document.createElement("div");
      legend.className = "chart-legend";
      row.appendChild(legend);
    }

    const visibleItems = currentComparisonLegend(meta).filter((item) => {
      if (appState.comparison === "No comparison" && (item.key === "previous" || item.key === "target")) return false;
      if (appState.comparison === "vs. Target" && item.key === "previous") return false;
      return true;
    });
    const signature = visibleItems.map((item) => `${item.key}:${item.label}:${item.style}`).join("|");

    if (visibleItems.length <= 1) {
      if (legend.dataset.legendSignature !== signature) {
        legend.replaceChildren();
        legend.dataset.legendSignature = signature;
      }
      if (!row.hidden) row.hidden = true;
      return;
    }

    if (row.hidden) row.hidden = false;
    if (legend.dataset.legendSignature === signature) return;

    legend.replaceChildren();
    for (const item of visibleItems) {
      legend.appendChild(createLegendItem(item));
    }
    legend.dataset.legendSignature = signature;
  }

  function tooltipMetricLabel(title, meta) {
    const singleLegendLabel = meta?.legend?.length === 1 ? meta.legend[0].label : "";
    if (singleLegendLabel && singleLegendLabel !== title) return singleLegendLabel;
    if (/revenue by branch|revenue by service line/i.test(title)) return "Revenue";
    if (/margin/i.test(title)) return "Margin";
    if (/occupancy|utilization/i.test(title)) return "Rate";
    if (/alos/i.test(title)) return "ALOS";
    if (/payor mix/i.test(title)) return "Share";
    return title.replace(/\s+(by|vs|—|-).*/i, "").trim() || "Metric";
  }

  function enhanceTooltipLabels() {
    document.querySelectorAll("main .rounded-2xl.border.bg-surface").forEach((card) => {
      const tooltip = card.querySelector(".recharts-tooltip-wrapper");
      if (!tooltip) return;

      const title = findCardTitle(card)?.textContent.trim() || "";
      const meta = title ? getChartMeta(title, card) : null;
      const label = tooltipMetricLabel(title, meta);

      tooltip.querySelectorAll("span").forEach((span) => {
        if (span.textContent.trim().toLowerCase() === "value" && span.textContent !== label) {
          span.textContent = label;
        }
      });
    });
  }

  function enhanceChartFurniture() {
    const cards = document.querySelectorAll("main .rounded-2xl.border.bg-surface");

    for (const card of cards) {
      const titleNode = findCardTitle(card);
      const title = titleNode?.textContent.trim();
      if (!title) continue;

      const meta = getChartMeta(title, card);
      if (!meta) continue;
      card.dataset.chartTitle = title;

      const svg = card.querySelector(".recharts-wrapper svg");
      const plotFrame = card.querySelector(".recharts-responsive-container")?.parentElement;
      if (plotFrame) {
        plotFrame.classList.remove("chart-plot-frame");
        delete plotFrame.dataset.xLabel;
        delete plotFrame.dataset.yLabel;
        plotFrame.querySelectorAll(":scope > .chart-axis-y, :scope > .chart-axis-x").forEach((axis) => axis.remove());
      }

      let row = card.querySelector(":scope > .chart-meta-row");
      if (!row) {
        row = document.createElement("div");
        row.className = "chart-meta-row";
        const chartBody = card.querySelector(".mt-3, .h-\\[280px\\], .h-\\[320px\\]") || card.children[1];
        card.insertBefore(row, chartBody);
      }

      row.querySelector(".chart-axis-label")?.remove();
      renderLegend(row, meta);
    }
  }

  function createRangePicker(card) {
    const picker = document.createElement("div");
    picker.className = "trend-range-picker";
    picker.setAttribute("role", "group");
    picker.setAttribute("aria-label", "Trend range");

    const selected = card.dataset.trendRange || defaultRange;
    for (const range of ranges) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = range;
      button.setAttribute("aria-pressed", String(range === selected));
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        setTrendRange(card, range);
      });
      picker.appendChild(button);
    }

    return picker;
  }

  function enhanceTrendCards() {
    const cards = document.querySelectorAll("main .rounded-2xl.border.bg-surface");

    for (const card of cards) {
      const hasLineChart = Boolean(
        card.querySelector(".recharts-wrapper svg path.recharts-line-curve") || card.querySelector(".native-trend-host"),
      );
      if (!hasLineChart) {
        card.querySelectorAll(".trend-range-picker").forEach((picker) => picker.remove());
        delete card.dataset.trendRange;
        continue;
      }

      const titleNode = findCardTitle(card);
      const title = titleNode?.textContent.trim() || "";
      const isPrimaryRevenueTrend = /^revenue trend(?:\s+vs target)?/i.test(title);
      if (!isPrimaryRevenueTrend) {
        card.querySelectorAll(".trend-range-picker").forEach((picker) => picker.remove());
        delete card.dataset.trendRange;
        continue;
      }

      const header = card.firstElementChild;
      if (!header || !header.className.includes("flex")) continue;

      if (!card.dataset.trendRange) card.dataset.trendRange = rangeForTimeframe(appState.timeframe);

      if (!header.querySelector(":scope > .trend-range-picker")) {
        header.dataset.trendHeader = "true";
        header.insertBefore(createRangePicker(card), header.children[1] || null);
      }

      updateRangePicker(card);
    }
  }

  function markOverviewChartCards() {
    document.querySelectorAll("main .rounded-2xl.border.bg-surface[data-overview-chart]").forEach((card) => {
      if (currentPath() !== "/overview") {
        delete card.dataset.overviewChart;
        delete card.dataset.overviewChartKind;
      }
    });

    if (currentPath() !== "/overview") return;

    document.querySelectorAll("main .rounded-2xl.border.bg-surface").forEach((card) => {
      const svg = card.querySelector(".recharts-wrapper svg, .native-trend-svg");
      if (!svg) {
        card.querySelector(":scope > :first-child > .trend-range-picker")?.remove();
        card.querySelector(":scope > .overview-chart-legend")?.remove();
        delete card.dataset.overviewChart;
        delete card.dataset.overviewChartKind;
        return;
      }

      const title = findCardTitle(card)?.textContent.trim() || "";
      if (title) card.dataset.chartTitle = title;
      card.dataset.overviewChart = "true";
      const lineCount = svg.querySelectorAll("path.recharts-line-curve, path.native-trend-current, path.native-trend-previous").length;
      card.dataset.overviewChartKind = lineCount ? "trend" : "bar";

      if (card.dataset.overviewChartKind !== "trend") {
        card.querySelector(":scope > :first-child > .trend-range-picker")?.remove();
        card.querySelector(":scope > .overview-chart-legend")?.remove();
        return;
      }

      const hasComparisonSeries = lineCount >= 2;
      if (!hasComparisonSeries) {
        card.querySelector(":scope > :first-child > .trend-range-picker")?.remove();
        card.querySelector(":scope > .overview-chart-legend")?.remove();
        delete card.dataset.trendRange;
        return;
      }

      const header = card.firstElementChild;
      if (header?.className.includes("flex")) {
        if (!card.dataset.trendRange) card.dataset.trendRange = rangeForTimeframe(appState.timeframe);
        if (!header.querySelector(":scope > .trend-range-picker")) {
          header.dataset.trendHeader = "true";
          header.insertBefore(createRangePicker(card), header.children[1] || null);
        }
        updateRangePicker(card);
      }

      if (card.querySelector(":scope > .overview-chart-legend")) return;

      const legendItems = /op vs ip trend/i.test(title)
        ? [
            { className: "overview-chart-mark--current", label: "OP visits" },
            { className: "overview-chart-mark--previous", label: "IP admissions" },
          ]
        : [
            { className: "overview-chart-mark--current", label: "Current period" },
            { className: "overview-chart-mark--previous", label: previousComparisonLabel() },
            { className: "overview-chart-mark--target", label: "Target" },
          ];

      const legend = document.createElement("div");
      legend.className = "overview-chart-legend";
      legend.innerHTML = legendItems
        .map((item) => `<span><i class="overview-chart-mark ${item.className}"></i>${item.label}</span>`)
        .join("");
      const chartBody = card.querySelector(".mt-3, .h-\\[280px\\], .h-\\[320px\\]") || card.children[1];
      if (chartBody) card.insertBefore(legend, chartBody);
      else card.appendChild(legend);
    });
  }

  function removeOverviewAttentionPanels() {
    if (currentPath() !== "/overview") return;
    if (activeRole() !== "COO") return;
    document.querySelectorAll("main .rounded-2xl.border.bg-surface, main section.rounded-2xl").forEach((card) => {
      const text = card.textContent.replace(/\s+/g, " ").trim();
      if (!/^Attention Needed\\b/i.test(text)) return;
      const parentGrid = card.parentElement;
      card.remove();
      if (parentGrid?.className?.toString().includes("lg:grid-cols-5")) {
        parentGrid.querySelectorAll(":scope > div, :scope > section, :scope > article").forEach((node) => {
          node.className = String(node.className || "").replace(/lg:col-span-3|lg:col-span-2/g, "").trim();
        });
      }
    });
  }

  function ceoStoryBranchAction(branch) {
    if (branch.name === "Westside") return "Invest";
    if (branch.name === "Eastview") return "Protect";
    if (branch.name === "Central" || branch.name === "Riverside") return "Intervene";
    return "Monitor";
  }

  function ceoStoryActionReason(branch) {
    if (branch.name === "Westside") return "Highest revenue with healthy occupancy.";
    if (branch.name === "Eastview") return "Stable growth and margin, protect capacity.";
    if (branch.name === "Central") return "Margin and occupancy pressure need executive attention.";
    if (branch.name === "Riverside") return "Dialysis and staffing drag are suppressing performance.";
    if (branch.name === "Northgate") return "Medium risk branch; watch margin and occupancy.";
    return "Low risk branch; maintain current operating rhythm.";
  }

  function ceoStoryBranchPosition(branch) {
    const positions = {
      Westside: { x: 82, y: 22 },
      Eastview: { x: 66, y: 32 },
      Northgate: { x: 54, y: 48 },
      Southpoint: { x: 42, y: 66 },
      Central: { x: 25, y: 79 },
      Riverside: { x: 27, y: 53 },
    };
    return positions[branch.name] || { x: 50, y: 50 };
  }

  function ceoStoryPortfolioMarkup() {
    const nodes = v2Branches
      .map((branch) => {
        const action = ceoStoryBranchAction(branch);
        const position = ceoStoryBranchPosition(branch);
        const risk = String(branch.risk).toLowerCase();
        return `
          <a class="ceo-story-map-node" href="${escapeHtml(roleAwareUrl("/branches?tab=performance", "CEO"))}" style="--x:${position.x}%;--y:${position.y}%;" data-action="${escapeHtml(action.toLowerCase())}" data-risk="${escapeHtml(risk)}">
            <strong>${escapeHtml(branch.name)}</strong>
            <span>₹${branch.revenue.toFixed(1)}Cr</span>
            <em>${branch.margin.toFixed(1)}% · ${branch.occupancy.toFixed(0)}%</em>
          </a>
        `;
      })
      .join("");

    return `
      <article class="ceo-story-card ceo-story-portfolio">
        <div class="ceo-story-section-head">
          <strong>Branch Risk Map</strong>
        </div>
        <div class="ceo-story-map-shell">
          <div class="ceo-story-map">
            <span class="ceo-story-map-axis ceo-story-map-axis--x">Revenue strength</span>
            <span class="ceo-story-map-axis ceo-story-map-axis--y">Operating risk</span>
            <span class="ceo-story-map-quadrant ceo-story-map-quadrant--scale">Scale</span>
            <span class="ceo-story-map-quadrant ceo-story-map-quadrant--fix">Fix</span>
            ${nodes}
          </div>
        </div>
        <div class="ceo-story-map-legend">
          <span><i data-tone="invest"></i>Invest</span>
          <span><i data-tone="protect"></i>Protect</span>
          <span><i data-tone="monitor"></i>Monitor</span>
          <span><i data-tone="intervene"></i>Intervene</span>
        </div>
      </article>
    `;
  }

  function ceoStoryInsightMarkup() {
    const mix = [
      { label: "Dialysis", value: "38%" },
      { label: "OPD", value: "26%" },
      { label: "IPD", value: "19%" },
      { label: "Diagnostics", value: "17%" },
    ];
    const flow = [
      { label: "OPD", value: "2.1k", tone: "good" },
      { label: "IPD", value: "642", tone: "good" },
      { label: "Beds", value: "84%", tone: "watch" },
      { label: "Dialysis", value: "78%", tone: "risk" },
    ];

    return `
      <aside class="ceo-story-insights ceo-story-visual-rail" aria-label="Hospital pulse">
        <a class="ceo-story-health-card" href="${escapeHtml(roleAwareUrl("/branches?tab=risk", "CEO"))}">
          <div class="ceo-story-ring" style="--score:82%">
            <span>82</span>
          </div>
          <div>
            <span>Network Health</span>
            <strong>Stable</strong>
            <em>2 branches at risk</em>
          </div>
        </a>
        <a class="ceo-story-mix-card" href="${escapeHtml(roleAwareUrl("/finance?tab=revenue-analysis", "CEO"))}">
          <div class="ceo-story-donut" aria-hidden="true"></div>
          <div class="ceo-story-donut-copy">
            <span>Revenue Mix</span>
            <strong>₹42.8Cr</strong>
            <div class="ceo-story-donut-legend">
              ${mix.map((item) => `<em><i></i>${escapeHtml(item.label)} ${escapeHtml(item.value)}</em>`).join("")}
            </div>
          </div>
        </a>
        <a class="ceo-story-flow-card" href="${escapeHtml(roleAwareUrl("/capacity-flow?tab=occupancy", "CEO"))}">
          <div class="ceo-story-flow-head">
            <span>Care Flow</span>
            <strong>84% occupied</strong>
          </div>
          <div class="ceo-story-flow-track">
            ${flow
              .map(
                (item) => `
                  <span data-tone="${escapeHtml(item.tone)}">
                    <i></i>
                    <strong>${escapeHtml(item.value)}</strong>
                    <em>${escapeHtml(item.label)}</em>
                  </span>
                `,
              )
              .join("")}
          </div>
        </a>
        <a class="ceo-story-risk-card" href="${escapeHtml(roleAwareUrl("/quality-safety", "CEO"))}">
          <span>Quality & Safety</span>
          <strong>97.3%</strong>
          <em>Compliance · 0 sentinel events</em>
        </a>
      </aside>
    `;
  }

  function ceoStoryWatchlistMarkup() {
    const items = [
      {
        status: "Invest",
        title: "Scale Westside",
        metric: "₹9.8Cr · 24.6%",
        href: "/branches?tab=performance",
      },
      {
        status: "Intervene",
        title: "Fix Central drag",
        metric: "18.4% · High risk",
        href: "/capacity-flow?tab=delay-contributors",
      },
      {
        status: "Monitor",
        title: "Watch Riverside",
        metric: "78.1% occ · 5.0d ALOS",
        href: "/dialysis-program?tab=utilization",
      },
    ];

    return `
      <article class="ceo-story-card ceo-story-watchlist">
        <div class="ceo-story-section-head">
          <strong>CEO Actions</strong>
        </div>
        <div class="ceo-story-watchlist-items">
          ${items
            .map(
              (item) => `
                <a class="ceo-story-watch-item" href="${escapeHtml(roleAwareUrl(item.href, "CEO"))}" data-action="${escapeHtml(item.status.toLowerCase())}">
                  <span>${escapeHtml(item.status)}</span>
                  <strong>${escapeHtml(item.title)}</strong>
                  <p>${escapeHtml(item.metric)}</p>
                </a>
              `,
            )
            .join("")}
        </div>
      </article>
    `;
  }

  function ceoStoryPulseBar(width) {
    return `<i class="ceo-story-pulse-bar" style="--bar:${Math.max(6, Math.min(100, width)).toFixed(1)}%"><b></b></i>`;
  }

  function ceoStoryHeadingMarkup() {
    return `
      <div class="ceo-story-section-head ceo-story-section-head--main">
        <strong>Hospital Pulse</strong>
      </div>
    `;
  }

  function enhanceCeoStorySnapshot(snapshot) {
    if (!snapshot || snapshot.dataset.ceoStorySnapshot === "true") return;
    snapshot.dataset.ceoStorySnapshot = "true";
    snapshot.classList.add("ceo-story-snapshot");

    const title = findCardTitle(snapshot);
    if (title && /branch performance snapshot/i.test(title.textContent)) {
      title.textContent = "Decision Support Snapshot";
    }

    const headRow = snapshot.querySelector("thead tr");
    if (headRow && !headRow.querySelector("[data-ceo-story-action-head]")) {
      const actionHead = document.createElement("th");
      actionHead.dataset.ceoStoryActionHead = "true";
      actionHead.className = "font-medium py-2.5 px-2 whitespace-nowrap pr-2";
      actionHead.textContent = "CEO Action";
      headRow.appendChild(actionHead);
    }

    snapshot.querySelectorAll("tbody tr").forEach((row) => {
      if (row.querySelector("[data-ceo-story-action-cell]")) return;
      const branchName = row.querySelector("td")?.textContent.replace(/\s+/g, " ").trim() || "";
      const branch = v2Branches.find((item) => item.name === branchName);
      if (!branch) return;
      const actionCell = document.createElement("td");
      actionCell.dataset.ceoStoryActionCell = "true";
      actionCell.className = "py-3 px-2 text-foreground/90 whitespace-nowrap pr-2";
      actionCell.innerHTML = `<span class="ceo-story-action-pill" data-action="${escapeHtml(ceoStoryBranchAction(branch).toLowerCase())}">${escapeHtml(ceoStoryBranchAction(branch))}</span>`;
      row.appendChild(actionCell);
    });
  }

  function enhanceCeoOverviewStory() {
    return false;
    if (currentPath() !== "/overview" || activeRole() !== "CEO") return false;
    const container = mainPageContainer();
    if (!container) return false;

    const existingStory = container.querySelector(":scope > .ceo-story-overview");
    if (existingStory) {
      enhanceCeoStorySnapshot(existingStory.querySelector(".ceo-story-snapshot"));
      return true;
    }

    const sections = [...container.children].filter((node) => node.nodeType === 1);
    const signal = sections.find((section) => /Network revenue is tracking/i.test(section.textContent));
    const scorecard = sections.find((section) => /Revenue₹42\.8Cr|Revenue\s*₹42\.8Cr/i.test(section.textContent) && /EBITDA/i.test(section.textContent));
    const chartGallery = sections.find((section) => /Revenue trend/i.test(section.textContent) && /EBITDA/i.test(section.textContent));
    const snapshot = sections.find((section) => /Branch Performance Snapshot/i.test(section.textContent) && section.querySelector("table"));
    const revenueTrendCard = [...(chartGallery?.querySelectorAll(".rounded-2xl.border.bg-surface") || [])].find((card) =>
      /^Revenue trend/i.test(findCardTitle(card)?.textContent.trim() || ""),
    );

    if (!signal || !scorecard || !chartGallery || !snapshot || !revenueTrendCard) return false;

    signal.classList.add("ceo-story-signal");
    scorecard.classList.add("ceo-story-scorecard");
    revenueTrendCard.classList.add("ceo-story-revenue-card");
    enhanceCeoStorySnapshot(snapshot);

    const wrapper = document.createElement("section");
    wrapper.className = "ceo-story-overview";
    wrapper.dataset.ceoStoryOverview = "true";

    const mainStory = document.createElement("section");
    mainStory.className = "ceo-story-main";
    mainStory.innerHTML = ceoStoryHeadingMarkup();
    const mainLayout = document.createElement("div");
    mainLayout.className = "ceo-story-main-layout";
    mainLayout.append(revenueTrendCard);
    mainLayout.insertAdjacentHTML("beforeend", ceoStoryInsightMarkup());
    mainStory.appendChild(mainLayout);

    const decisionGrid = document.createElement("section");
    decisionGrid.className = "ceo-story-decision-grid";
    decisionGrid.innerHTML = `${ceoStoryPortfolioMarkup()}${ceoStoryWatchlistMarkup()}`;

    wrapper.append(signal, scorecard, mainStory, decisionGrid, snapshot);
    container.replaceChildren(wrapper);

    updateOverviewActionLinks("CEO", overviewDrilldownRoute("CEO"));
    return true;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => {
      const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
      return entities[char];
    });
  }

  function detectOverviewRole() {
    const roleControlText = Array.from(document.querySelectorAll("button"))
      .map((button) => button.textContent.replace(/\s+/g, " ").trim())
      .find((text) => /(Sarah Chen|All Branches)/i.test(text) && /\b(COO|CEO)\b/i.test(text));

    if (/COO\s*·/i.test(roleControlText || "")) return "COO";
    if (/CEO\s*·/i.test(roleControlText || "")) return "CEO";

    const scope = (mainPageContainer() || document.body).cloneNode(true);
    scope.querySelectorAll(".revenue-lens-card, [data-revenue-lens]").forEach((node) => node.remove());
    const text = scope.textContent.replace(/\s+/g, " ");
    return /COO workspace|Revenue Cycle Operations|Operations attention|Patient flow|Discharges|Dialysis|Surgery|Staff/i.test(
      text,
    )
      ? "COO"
      : "CEO";
  }

  function revenueLensRole() {
    const path = currentPath();
    if (path === "/finance") return "CEO";
    if (path === "/revenue-cycle-ops") return "COO";
    return detectOverviewRole();
  }

  function revenueLensModuleLabel(role) {
    const path = currentPath();
    if (path === "/finance") return "CEO finance module";
    if (path === "/revenue-cycle-ops") return "COO revenue cycle module";
    return `${role} overview module`;
  }

  function revenueLensScale() {
    const branchOffset = branchModifiers[appState.branch] ?? 0;
    const branchScale = appState.branch === "All Network Branches" ? 1 : Math.max(0.38, 0.62 + branchOffset / 12);
    const timeframeScale =
      appState.timeframe === "Today"
        ? 0.04
        : appState.timeframe === "Last 7 days"
          ? 0.28
          : appState.timeframe === "Quarter to date"
          ? 1.8
          : appState.timeframe === "Year to date"
            ? 5.6
            : 1;
    return branchScale * timeframeScale;
  }

  function revenueLensRows(role, focus) {
    const config = revenueLensDataset[role] || revenueLensDataset.CEO;
    const scale = revenueLensScale();
    return (config[focus] || config.Department).map((row) => ({
      ...row,
      value: Math.max(0.8, row.value * scale),
    }));
  }

  function revenueLensValue(value) {
    return `₹${value >= 10 ? value.toFixed(0) : value.toFixed(1)}Cr`;
  }

  function createRevenueLens() {
    const section = document.createElement("section");
    section.className = "revenue-lens-card rounded-2xl border border-border bg-surface p-5";
    section.dataset.revenueLens = "true";
    section.dataset.focus = "Department";

    section.addEventListener("click", (event) => {
      const button = event.target.closest(".revenue-lens-tab");
      if (!button || !section.contains(button)) return;
      section.dataset.focus = button.dataset.focus || "Department";
      renderRevenueLens(section);
    });

    return section;
  }

  function renderRevenueLens(section) {
    const role = revenueLensRole();
    const config = revenueLensDataset[role] || revenueLensDataset.CEO;
    const focus = revenueLensFocuses.includes(section.dataset.focus) ? section.dataset.focus : "Department";
    const rows = revenueLensRows(role, focus);
    const max = Math.max(...rows.map((row) => row.value), 1);
    const timelineMax = Math.max(...config.timeline, 1);
    const moduleLabel = revenueLensModuleLabel(role);
    const contextLabel =
      appState.branch === "All Network Branches"
        ? `${appState.branch} · ${appState.timeframe}`
        : `${appState.branch} branch · ${appState.timeframe}`;

    section.dataset.role = role;
    section.innerHTML = `
      <div class="revenue-lens-header">
        <div class="min-w-0">
          <div class="revenue-lens-kicker">${escapeHtml(moduleLabel)}</div>
          <div class="revenue-lens-title">${escapeHtml(config.title)}</div>
          <p class="revenue-lens-description">${escapeHtml(config.description)}</p>
        </div>
        <div class="revenue-lens-context">${escapeHtml(contextLabel)}</div>
      </div>

      <div class="revenue-lens-tabs" role="tablist" aria-label="Revenue lens dimension">
        ${revenueLensFocuses
          .map(
            (item) => `
              <button class="revenue-lens-tab" type="button" role="tab" data-focus="${escapeHtml(item)}" aria-selected="${String(
                item === focus,
              )}" aria-pressed="${String(item === focus)}">
                ${escapeHtml(item)}
              </button>
            `,
          )
          .join("")}
      </div>

      <div class="revenue-lens-body">
        <div class="revenue-lens-metrics" aria-label="Revenue lens metrics">
          ${config.metrics
            .map(
              (metric) => `
                <div class="revenue-lens-metric">
                  <span>${escapeHtml(metric.label)}</span>
                  <strong>${escapeHtml(metric.value)}</strong>
                  <em data-tone="${escapeHtml(metric.tone)}">${escapeHtml(metric.delta)}</em>
                </div>
              `,
            )
            .join("")}
        </div>

        <div class="revenue-lens-chart" aria-label="Revenue by ${escapeHtml(focus)}">
          <div class="revenue-lens-chart-head">
            <span>Revenue by ${escapeHtml(focus.toLowerCase())}</span>
            <span>Top ${rows.length}</span>
          </div>
          <div class="revenue-lens-bars">
            ${rows
              .map(
                (row, index) => `
                  <div class="revenue-lens-bar-row" style="--bar-width:${Math.max(12, (row.value / max) * 100).toFixed(
                    2,
                  )}%; --bar-color:var(--color-chart-${(index % 5) + 1});">
                    <div class="revenue-lens-bar-label">
                      <strong>${escapeHtml(row.name)}</strong>
                      <span>${escapeHtml(row.sub)}</span>
                    </div>
                    <div class="revenue-lens-bar-track">
                      <span class="revenue-lens-bar"></span>
                    </div>
                    <div class="revenue-lens-bar-value">${escapeHtml(revenueLensValue(row.value))}</div>
                  </div>
                `,
              )
              .join("")}
          </div>
        </div>

        <aside class="revenue-lens-note">
          <div class="revenue-lens-note-label">${escapeHtml(config.insight.label)}</div>
          <p>${escapeHtml(config.insight.text)}</p>
          <div class="revenue-lens-field-list" aria-label="Available drilldowns">
            ${revenueLensFocuses.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
          </div>
        </aside>
      </div>

      <div class="revenue-lens-timeline" aria-label="Revenue over time">
        <div class="revenue-lens-chart-head">
          <span>Revenue over time</span>
          <span>${escapeHtml(appState.comparison)}</span>
        </div>
        <div class="revenue-lens-time-bars">
          ${config.timeline
            .map(
              (value, index) => `
                <span style="--time-height:${Math.max(22, (value / timelineMax) * 100).toFixed(2)}%" title="M${
                  index + 1
                } · ₹${value}Cr"></span>
              `,
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function enhanceRevenueLens() {
    const path = currentPath();
    const container = mainPageContainer();
    if (!container) return;

    if (!revenueLensPaths.has(path)) {
      container.querySelector(":scope > .revenue-lens-card")?.remove();
      return;
    }

    let section = container.querySelector(":scope > .revenue-lens-card");
    if (!section) {
      section = createRevenueLens();
      const children = [...container.children];
      const overviewCharts = path === "/overview" ? container.querySelector(":scope > section.space-y-6") : null;
      const tabs = children.find(isSubpageTabs);
      const metrics = children.find(isMetricsStrip);

      if (overviewCharts) {
        overviewCharts.insertAdjacentElement("afterend", section);
      } else if (tabs) {
        tabs.insertAdjacentElement("afterend", section);
      } else if (metrics) {
        metrics.insertAdjacentElement("afterend", section);
      } else {
        container.appendChild(section);
      }
    }

    const role = revenueLensRole();
    if (
      section.dataset.role !== role ||
      section.dataset.path !== path ||
      section.dataset.branch !== appState.branch ||
      section.dataset.timeframe !== appState.timeframe ||
      section.dataset.comparison !== appState.comparison
    ) {
      section.dataset.path = path;
      section.dataset.branch = appState.branch;
      section.dataset.timeframe = appState.timeframe;
      section.dataset.comparison = appState.comparison;
      renderRevenueLens(section);
    }
  }

  function financeDrilldownState(section) {
    return {
      field: financeDrilldownFields.includes(section.dataset.field) ? section.dataset.field : "Department",
      yearMonth: section.dataset.yearMonth || "All",
      monthYear: section.dataset.monthYear || "All",
      department: section.dataset.department || "All",
      doctor: section.dataset.doctor || "All",
      centre: section.dataset.centre || "All",
    };
  }

  function financeDrilldownScale(state) {
    const branchOffset = branchModifiers[appState.branch] ?? 0;
    let scale = appState.branch === "All Network Branches" ? 1 : Math.max(0.42, 0.72 + branchOffset / 16);
    if (state.centre !== "All") scale *= 0.56;
    if (state.department !== "All") scale *= 0.64;
    if (state.doctor !== "All") scale *= 0.34;
    if (state.monthYear !== "All") scale *= 0.9;
    if (state.yearMonth === "2025") scale *= 0.94;
    if (state.yearMonth === "2024") scale *= 0.84;
    return scale;
  }

  function financeDrilldownRows(state) {
    const scale = financeDrilldownScale(state);
    return (financeDrilldownData[state.field] || financeDrilldownData.Department).map((row) => ({
      ...row,
      total: row.total * scale,
      female: row.female * scale,
      male: row.male * scale,
      unmapped: row.unmapped * scale,
    }));
  }

  function financeDrilldownValue(value) {
    if (value >= 100) return `₹${Math.round(value)}Cr`;
    if (value >= 10) return `₹${Math.round(value)}Cr`;
    return `₹${value.toFixed(1)}Cr`;
  }

  function financeDrilldownKpis(state) {
    const focused = [state.department, state.doctor, state.centre].some((value) => value !== "All");
    return [
      { label: "Lab visit %", value: focused ? "25.8%" : "23.5%", delta: focused ? "+2.1pp" : "+1.8pp" },
      { label: "Day diff between visits", value: focused ? "31.6" : "34.75", delta: focused ? "-3.1d" : "-2.4d" },
      { label: "Revenue per visit", value: focused ? "₹286" : "₹279", delta: focused ? "+4.8%" : "+3.8%" },
    ];
  }

  function financeTrendPath(values, min = -70, max = 30) {
    const width = 1000;
    const top = 12;
    const bottom = 164;
    return values
      .map((value, index) => {
        const x = (index / Math.max(values.length - 1, 1)) * width;
        const y = bottom - ((value - min) / (max - min)) * (bottom - top);
        return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  }

  function financeTrendPointY(value, min = -70, max = 30) {
    const top = 12;
    const bottom = 164;
    const height = 180;
    const y = bottom - ((value - min) / (max - min)) * (bottom - top);
    return (y / height) * 100;
  }

  function financeFilterMarkup(state, key) {
    const label = financeDrilldownFilterLabels[key];
    const value = state[key] || "All";
    return `
      <div class="finance-dd-filter">
        <button type="button" data-finance-filter-trigger="${escapeHtml(key)}" aria-expanded="false">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </button>
      </div>
    `;
  }

  function closeFinanceFilterMenus(section, except) {
    section.querySelectorAll(".finance-dd-menu").forEach((menu) => {
      if (menu !== except) menu.remove();
    });
    section.querySelectorAll("[data-finance-filter-trigger][aria-expanded='true']").forEach((button) => {
      if (!except || button.nextElementSibling !== except) button.setAttribute("aria-expanded", "false");
    });
  }

  function openFinanceFilterMenu(section, trigger, key) {
    const wrapper = trigger.closest(".finance-dd-filter");
    if (!wrapper) return;

    const existing = wrapper.querySelector(":scope > .finance-dd-menu");
    if (existing) {
      existing.remove();
      trigger.setAttribute("aria-expanded", "false");
      return;
    }

    closeFinanceFilterMenus(section);
    const current = section.dataset[key] || "All";
    const menu = document.createElement("div");
    menu.className = "finance-dd-menu";
    menu.setAttribute("role", "menu");
    menu.innerHTML = financeDrilldownFilters[key]
      .map(
        (option) => `
          <button type="button" role="menuitemradio" aria-checked="${String(
            option === current,
          )}" data-finance-filter="${escapeHtml(key)}" data-finance-filter-option="${escapeHtml(option)}">
            ${escapeHtml(option)}
          </button>
        `,
      )
      .join("");
    trigger.setAttribute("aria-expanded", "true");
    wrapper.appendChild(menu);
  }

  function financeResetNeeded(section) {
    return ["yearMonth", "monthYear", "department", "doctor", "centre"].some((key) => (section.dataset[key] || "All") !== "All");
  }

  function createFinanceDrilldown() {
    const section = document.createElement("section");
    section.className = "finance-drilldown-card";
    section.dataset.financeDrilldown = "true";
    section.dataset.field = "Department";
    section.dataset.yearMonth = "All";
    section.dataset.monthYear = "All";
    section.dataset.department = "All";
    section.dataset.doctor = "All";
    section.dataset.centre = "All";

    section.addEventListener("click", (event) => {
      const field = event.target.closest("[data-finance-field]");
      const trigger = event.target.closest("[data-finance-filter-trigger]");
      const option = event.target.closest("[data-finance-filter-option]");
      const reset = event.target.closest("[data-finance-reset]");

      if (field && section.contains(field)) {
        event.preventDefault();
        const nextField = field.dataset.financeField || "Department";
        if (section.dataset.field === nextField) return;
        closeFinanceFilterMenus(section);
        section.dataset.field = nextField;
        renderFinanceDrilldown(section);
        return;
      }

      if (trigger && section.contains(trigger)) {
        event.preventDefault();
        const key = trigger.dataset.financeFilterTrigger;
        openFinanceFilterMenu(section, trigger, key);
        return;
      }

      if (option && section.contains(option)) {
        event.preventDefault();
        const key = option.dataset.financeFilter;
        const value = option.dataset.financeFilterOption || "All";
        if ((section.dataset[key] || "All") === value) {
          closeFinanceFilterMenus(section);
          return;
        }
        section.dataset[key] = value;
        closeFinanceFilterMenus(section);
        renderFinanceDrilldown(section);
        return;
      }

      if (reset && section.contains(reset)) {
        event.preventDefault();
        if (!financeResetNeeded(section)) return;
        section.dataset.yearMonth = "All";
        section.dataset.monthYear = "All";
        section.dataset.department = "All";
        section.dataset.doctor = "All";
        section.dataset.centre = "All";
        closeFinanceFilterMenus(section);
        renderFinanceDrilldown(section);
      }
    });

    return section;
  }

  function renderFinanceDrilldown(section) {
    const state = financeDrilldownState(section);
    const rows = financeDrilldownRows(state);
    const kpis = financeDrilldownKpis(state);
    const max = Math.max(...rows.map((row) => row.total), 1);
    const revenueMax = Math.max(...financeDrilldownTrend.map((item) => item.revenue), 1);
    const pathPrev = financeTrendPath(financeDrilldownTrend.map((item) => item.prev));
    const pathSame = financeTrendPath(financeDrilldownTrend.map((item) => item.same));
    const context = `${appState.branch} · ${appState.timeframe}`;
    const totalRevenue = rows.reduce((sum, row) => sum + row.total, 0);
    const topRow = rows[0] || { label: "Network", total: 0, female: 0, male: 0, unmapped: 0 };
    const topShare = totalRevenue > 0 ? (topRow.total / totalRevenue) * 100 : 0;
    const topThreeShare = totalRevenue > 0 ? (rows.slice(0, 3).reduce((sum, row) => sum + row.total, 0) / totalRevenue) * 100 : 0;
    const activeFilters = [
      state.yearMonth !== "All" ? state.yearMonth : "",
      state.monthYear !== "All" ? state.monthYear : "",
      state.department !== "All" ? state.department : "",
      state.doctor !== "All" ? state.doctor : "",
      state.centre !== "All" ? state.centre : "",
    ].filter(Boolean);

    section.dataset.renderedBranch = appState.branch;
    section.dataset.renderedTimeframe = appState.timeframe;
    section.dataset.renderedComparison = appState.comparison;
    section.innerHTML = `
      <div class="finance-dd-header">
        <div>
          <div class="finance-dd-kicker">Drilldown workspace</div>
          <h2>Revenue analysis</h2>
          <p>Explore the same revenue base by branch, department, doctor, and patient mix.</p>
        </div>
        <div class="finance-dd-context">${escapeHtml(context)}</div>
      </div>

      <div class="finance-dd-toolbar">
        <div class="finance-dd-field-tabs" role="tablist" aria-label="Revenue breakdown dimension">
          ${financeDrilldownFields
            .map(
              (field) => `
                <button type="button" role="tab" data-finance-field="${escapeHtml(field)}" aria-selected="${String(
                  field === state.field,
                )}" aria-pressed="${String(field === state.field)}">
                  ${escapeHtml(field)}
                </button>
              `,
            )
            .join("")}
        </div>

        <div class="finance-dd-filter-row">
            ${financeFilterMarkup(state, "yearMonth")}
            ${financeFilterMarkup(state, "monthYear")}
            ${financeFilterMarkup(state, "department")}
            ${financeFilterMarkup(state, "doctor")}
            ${financeFilterMarkup(state, "centre")}
            <button class="finance-dd-reset" type="button" data-finance-reset>Reset</button>
        </div>
      </div>

      <div class="finance-dd-content-grid">
        <div class="finance-dd-panel finance-dd-breakdown-panel">
          <div class="finance-dd-chart-title">
            <div>
              <span>Revenue by ${escapeHtml(state.field.toLowerCase())}</span>
              <strong>${escapeHtml(activeFilters.length ? activeFilters.join(" · ") : "All records")}</strong>
            </div>
            <div class="finance-dd-legend" aria-label="Segment legend">
              <span data-segment="female">Female</span>
              <span data-segment="male">Male</span>
              <span data-segment="unmapped">Other</span>
            </div>
          </div>

          <div class="finance-dd-bars" aria-label="Revenue by ${escapeHtml(state.field)}">
            ${rows
              .map((row) => {
                const rowWidth = Math.max(8, (row.total / max) * 100);
                const femaleWidth = Math.max(4, (row.female / row.total) * 100);
                const maleWidth = Math.max(4, (row.male / row.total) * 100);
                const unmappedWidth = Math.max(3, (row.unmapped / row.total) * 100);
                return `
                  <div class="finance-dd-bar-row">
                    <div class="finance-dd-bar-label">
                      <strong>${escapeHtml(row.label)}</strong>
                      <span>${escapeHtml(`${Math.round((row.total / totalRevenue) * 100)}% of selected revenue`)}</span>
                    </div>
                    <div class="finance-dd-bar-track">
                      <div class="finance-dd-bar-fill" style="--row-width:${rowWidth.toFixed(2)}%">
                        <span class="finance-dd-segment finance-dd-female" style="--segment-width:${femaleWidth.toFixed(2)}%"></span>
                        <span class="finance-dd-segment finance-dd-male" style="--segment-width:${maleWidth.toFixed(2)}%"></span>
                        <span class="finance-dd-segment finance-dd-unmapped" style="--segment-width:${unmappedWidth.toFixed(2)}%"></span>
                      </div>
                    </div>
                    <div class="finance-dd-bar-value">${escapeHtml(financeDrilldownValue(row.total))}</div>
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>

        <aside class="finance-dd-panel finance-dd-summary">
          <div class="finance-dd-chart-title">
            <div>
              <span>Selected view</span>
              <strong>${escapeHtml(state.field)}</strong>
            </div>
          </div>

          <div class="finance-dd-kpis">
            ${kpis
              .map(
                (kpi) => `
                  <div class="finance-dd-kpi">
                    <span>${escapeHtml(kpi.label)}</span>
                    <strong>${escapeHtml(kpi.value)}</strong>
                    <em>${escapeHtml(kpi.delta)}</em>
                  </div>
                `,
              )
              .join("")}
          </div>

          <div class="finance-dd-insight">
            <span>Largest contributor</span>
            <strong>${escapeHtml(topRow.label)}</strong>
            <p>${escapeHtml(`${financeDrilldownValue(topRow.total)} revenue, ${Math.round(topShare)}% of the selected cut.`)}</p>
          </div>
          <div class="finance-dd-insight">
            <span>Concentration</span>
            <strong>${escapeHtml(`${Math.round(topThreeShare)}%`)}</strong>
            <p>Top 3 categories carry most of the selected revenue movement.</p>
          </div>
        </aside>
      </div>

      <div class="finance-dd-panel finance-dd-time">
        <div class="finance-dd-chart-title">
          <div>
            <span>Revenue by time</span>
            <strong>Net amount and growth rate</strong>
          </div>
          <div class="finance-dd-legend">
            <span data-segment="net">Net amount</span>
            <span data-segment="previous">Growth vs prev month</span>
            <span data-segment="same">Growth vs same month PY</span>
          </div>
        </div>
        <div class="finance-dd-time-chart">
          ${financeDrilldownTrend
            .map(
              (item) => `
                <div class="finance-dd-time-bar" style="--time-height:${Math.max(
                  18,
                  (item.revenue / revenueMax) * 100,
                ).toFixed(2)}%">
                  <span>${escapeHtml(String(item.revenue))}M</span>
                  <em>${escapeHtml(item.label)}</em>
                </div>
              `,
            )
            .join("")}
          <svg class="finance-dd-time-lines" viewBox="0 0 1000 180" preserveAspectRatio="none" aria-hidden="true">
            <path class="finance-dd-prev-line" d="${escapeHtml(pathPrev)}"></path>
            <path class="finance-dd-same-line" d="${escapeHtml(pathSame)}"></path>
          </svg>
        </div>
      </div>
    `;
  }

  function setFinanceDrilldownTab(tabs) {
    tabs?.querySelectorAll("button").forEach((button) => {
      const active = /drilldown/i.test(button.textContent);
      button.dataset.financeDrilldownTab = active ? "active" : "inactive";
    });
  }

  function hideLegacyFinanceBlocks(container, section) {
    let afterSection = false;
    [...container.children].forEach((child) => {
      if (child === section) {
        afterSection = true;
        return;
      }
      if (!afterSection || child.classList.contains("finance-drilldown-card")) return;
      if (child.querySelector?.(".recharts-responsive-container, table")) {
        child.classList.add("finance-drilldown-hidden");
      }
    });
  }

  function enhanceFinanceDrilldown() {
    const container = mainPageContainer();
    if (!container) return;
    if (document.body.dataset.v2Foundation === "true") {
      container.querySelector(":scope > .finance-drilldown-card")?.remove();
      document.querySelectorAll(".finance-drilldown-hidden").forEach((node) => node.classList.remove("finance-drilldown-hidden"));
      return;
    }

    if (currentPath() !== "/finance") {
      container.querySelector(":scope > .finance-drilldown-card")?.remove();
      document.querySelectorAll(".finance-drilldown-hidden").forEach((node) => node.classList.remove("finance-drilldown-hidden"));
      document.querySelectorAll("[data-finance-drilldown-tab]").forEach((node) => delete node.dataset.financeDrilldownTab);
      return;
    }

    const children = [...container.children];
    const metrics = children.find(isMetricsStrip);
    const tabs = children.find(isSubpageTabs);
    setFinanceDrilldownTab(tabs);

    let section = container.querySelector(":scope > .finance-drilldown-card");
    if (!section) {
      section = createFinanceDrilldown();
      if (tabs) {
        tabs.insertAdjacentElement("afterend", section);
      } else if (metrics) {
        metrics.insertAdjacentElement("afterend", section);
      } else {
        container.appendChild(section);
      }
    }

    hideLegacyFinanceBlocks(container, section);

    if (
      section.dataset.renderedBranch !== appState.branch ||
      section.dataset.renderedTimeframe !== appState.timeframe ||
      section.dataset.renderedComparison !== appState.comparison ||
      !section.dataset.rendered
    ) {
      section.dataset.rendered = "true";
      renderFinanceDrilldown(section);
    }
  }

  function rangeForTimeframe(timeframe) {
    if (timeframe === "Today") return "Daily";
    if (timeframe === "Last 7 days") return "Daily";
    if (timeframe === "Quarter to date") return "Weekly";
    if (timeframe === "Year to date") return "Yearly";
    return "Monthly";
  }

  function setGlobalTimeframe(timeframe) {
    appState.timeframe = timeframe;
    if (timeframe === "Today") {
      appState.comparison = "vs. Yesterday";
    } else if (appState.comparison === "vs. Yesterday") {
      appState.comparison = "vs. Previous period";
    }
  }

  function setTrendRange(card, range) {
    card.dataset.trendRange = range;
    setGlobalTimeframe(
      range === "Daily"
        ? "Last 7 days"
        : range === "Weekly"
          ? "Quarter to date"
          : range === "Yearly"
            ? "Year to date"
            : "Last 30 days",
    );
    runWithObserverPaused(() => {
      updateRangePicker(card);
      updateGlobalControlLabels();
      updateTrendChart(card);
      disableChartMotion(card);
      markOverviewChartCards();
    });
  }

  function updateRangePicker(card) {
    const selected = card.dataset.trendRange || defaultRange;
    for (const button of card.querySelectorAll(".trend-range-picker button")) {
      button.setAttribute("aria-pressed", String(button.textContent === selected));
    }
  }

  function numericTicks(svg) {
    return [...svg.querySelectorAll(".recharts-cartesian-axis-tick-value")]
      .map((tick) => ({
        node: tick,
        value: Number(tick.textContent.trim()),
        x: Number(tick.getAttribute("x")),
        y: Number(tick.getAttribute("y")),
      }))
      .filter((tick) => Number.isFinite(tick.value) && Number.isFinite(tick.x) && Number.isFinite(tick.y));
  }

  function plotBounds(svg, firstLine) {
    const gridYs = [...svg.querySelectorAll("line[stroke='var(--color-border)']")]
      .flatMap((line) => [Number(line.getAttribute("y1")), Number(line.getAttribute("y2"))])
      .filter(Number.isFinite);
    const coords = getPathCoordinates(firstLine);
    return {
      left: coords?.firstX ?? 26,
      right: coords?.lastX ?? Number(svg.getAttribute("width")) - 8,
      top: Math.min(...gridYs, 8),
      bottom: Math.max(...gridYs, Number(svg.getAttribute("height")) - 30),
    };
  }

  function getPathCoordinates(path) {
    const values = (path.getAttribute("d") || "").match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number) || [];
    if (values.length < 4) return null;
    return {
      firstX: values[0],
      firstY: values[1],
      lastX: values[values.length - 2],
      lastY: values[values.length - 1],
    };
  }

  function getPathPoints(path) {
    const points = [];
    const commands = path.getAttribute("d") || "";
    const commandPattern = /([MLC])([^MLC]*)/gi;
    let match;

    const addPoint = (x, y) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const previous = points[points.length - 1];
      if (!previous || Math.abs(previous.x - x) > 0.5 || Math.abs(previous.y - y) > 0.5) {
        points.push({ x, y });
      }
    };

    while ((match = commandPattern.exec(commands))) {
      const command = match[1].toUpperCase();
      const values = match[2].match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number) || [];
      if (values.length < 2) continue;

      if (command === "C" && values.length >= 6) {
        addPoint(values[values.length - 2], values[values.length - 1]);
        continue;
      }

      for (let index = 0; index < values.length - 1; index += 2) {
        addPoint(values[index], values[index + 1]);
      }
    }

    return points;
  }

  function smoothPath(points) {
    if (points.length < 2) return "";
    const d = [`M${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`];
    for (let index = 0; index < points.length - 1; index += 1) {
      const current = points[index];
      const next = points[index + 1];
      const previous = points[index - 1] || current;
      const after = points[index + 2] || next;
      const cp1 = {
        x: current.x + (next.x - previous.x) / 6,
        y: current.y + (next.y - previous.y) / 6,
      };
      const cp2 = {
        x: next.x - (after.x - current.x) / 6,
        y: next.y - (after.y - current.y) / 6,
      };
      d.push(
        `C${cp1.x.toFixed(2)},${cp1.y.toFixed(2)} ${cp2.x.toFixed(2)},${cp2.y.toFixed(2)} ${next.x.toFixed(2)},${next.y.toFixed(2)}`,
      );
    }
    return d.join(" ");
  }

  function yScale(svg, bounds) {
    const ticks = numericTicks(svg).filter((tick) => tick.x < bounds.left);
    const min = Math.min(...ticks.map((tick) => tick.value), 0);
    const max = Math.max(...ticks.map((tick) => tick.value), 60);
    return (value) => bounds.bottom - ((value - min) / (max - min)) * (bounds.bottom - bounds.top);
  }

  function seriesFor(card) {
    const range = card.dataset.trendRange || defaultRange;
    const source = rangeSeries[range] || rangeSeries[defaultRange];
    const branchOffset = branchModifiers[appState.branch] ?? 0;
    const compareOffset =
      appState.comparison === "vs. Same period LY" ? -2.6 : appState.comparison === "vs. Target" ? 0.8 : 0;

    return {
      labels: source.labels,
      current: source.current.map((value) => value + branchOffset),
      previous: source.previous.map((value) => value + branchOffset + compareOffset),
      target: source.target.map((value) => value + branchOffset * 0.35),
    };
  }

  function isRevenueTrendCard(card) {
    if (!card) return false;
    const title = (card?.dataset?.chartTitle || findCardTitle(card)?.textContent || "").trim();
    return /revenue trend|trend vs target/i.test(title);
  }

  function trendPoints(values, bounds, min, max) {
    const step = (bounds.right - bounds.left) / Math.max(values.length - 1, 1);
    return values.map((value, index) => ({
      x: bounds.left + step * index,
      y: bounds.bottom - ((value - min) / (max - min)) * (bounds.bottom - bounds.top),
    }));
  }

  function renderNativeTrendChart(card) {
    if (!isRevenueTrendCard(card)) return false;

    let host = card.querySelector(".native-trend-host");
    const chartSlot =
      host?.parentElement ||
      card.querySelector(".recharts-responsive-container")?.parentElement ||
      [...card.querySelectorAll("div")].find((node) => node.className?.toString().includes("h-["));

    if (!chartSlot) return false;
    if (!host) {
      chartSlot.innerHTML = '<div class="native-trend-host"></div>';
      host = chartSlot.querySelector(".native-trend-host");
    }

    const data = seriesFor(card);
    const allValues = [...data.current, ...data.previous, ...data.target];
    const min = 0;
    const max = Math.max(60, Math.ceil(Math.max(...allValues) / 15) * 15);
    const bounds = { left: 50, right: 828, top: 28, bottom: 304 };
    const ticks = [max, max * 0.75, max * 0.5, max * 0.25, min];
    const current = trendPoints(data.current, bounds, min, max);
    const previous = trendPoints(data.previous, bounds, min, max);
    const target = trendPoints(data.target, bounds, min, max);
    const currentPath = smoothPath(current);
    const previousPath = smoothPath(previous);
    const targetPath = smoothPath(target);
    const currentArea = `${currentPath} L${current[current.length - 1].x.toFixed(2)},${bounds.bottom} L${current[0].x.toFixed(2)},${bounds.bottom} Z`;
    const previousVisible = appState.comparison !== "No comparison" && appState.comparison !== "vs. Target";
    const targetVisible = appState.comparison !== "No comparison";
    const gradientId =
      card.dataset.nativeTrendId ||
      (card.dataset.nativeTrendId = `native-trend-${Math.random().toString(36).slice(2)}`);

    const grid = ticks
      .map((tick) => {
        const y = bounds.bottom - ((tick - min) / (max - min)) * (bounds.bottom - bounds.top);
        const label = tick === 0 ? "" : String(Math.round(tick));
        return `
          <line x1="${bounds.left}" x2="${bounds.right}" y1="${y.toFixed(2)}" y2="${y.toFixed(2)}" class="native-trend-grid" />
          <text x="${bounds.left - 16}" y="${(y + 5).toFixed(2)}" text-anchor="end" class="native-trend-tick">${escapeHtml(label)}</text>
        `;
      })
      .join("");

    const labels = data.labels
      .map((label, index) => {
        const x = bounds.left + ((bounds.right - bounds.left) / Math.max(data.labels.length - 1, 1)) * index;
        return `<text x="${x.toFixed(2)}" y="${bounds.bottom + 23}" text-anchor="middle" class="native-trend-label">${escapeHtml(label)}</text>`;
      })
      .join("");

    host.innerHTML = `
      <svg class="native-trend-svg" viewBox="0 0 860 340" preserveAspectRatio="none" role="img" aria-label="Revenue trend chart">
        <defs>
          <linearGradient id="${gradientId}" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="${bounds.top}" y2="${bounds.bottom}">
            <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.34" />
            <stop offset="48%" stop-color="var(--color-primary)" stop-opacity="0.16" />
            <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0.015" />
          </linearGradient>
        </defs>
        ${grid}
        <path d="${currentArea}" fill="url(#${gradientId})" class="native-trend-area" />
        ${targetVisible ? `<path d="${targetPath}" class="native-trend-line native-trend-target" />` : ""}
        ${previousVisible ? `<path d="${previousPath}" class="native-trend-line native-trend-previous" />` : ""}
        <path d="${currentPath}" class="native-trend-line native-trend-current" />
        ${labels}
      </svg>
    `;

    card.dataset.renderedRange = card.dataset.trendRange || defaultRange;
    card.dataset.renderedBranch = appState.branch;
    card.dataset.renderedComparison = appState.comparison;
    return true;
  }

  function updateXAxisTicks(svg, labels, bounds) {
    const ticks = [...svg.querySelectorAll(".recharts-cartesian-axis-tick-value")]
      .map((tick) => ({ node: tick, x: Number(tick.getAttribute("x")), y: Number(tick.getAttribute("y")) }))
      .filter((tick) => Number.isFinite(tick.x) && Number.isFinite(tick.y) && tick.y > bounds.bottom)
      .sort((a, b) => a.x - b.x);

    ticks.slice(0, labels.length).forEach((tick, index) => {
      if (tick.node.textContent !== labels[index]) {
        tick.node.textContent = labels[index];
      }
    });
  }

  function updateArea(svg, line, index, bounds) {
    let area = svg.querySelector(`.chart-gradient-area[data-series-index="${index}"]`);
    const coords = getPathCoordinates(line);
    if (!coords) return;

    const gradientId = `chart-current-area-${svg.dataset.chartVisualIndex || "0"}`;
    if (index === 0) {
      addGradientDef(svg, gradientId, [
        { offset: "0%", color: "#18a9b8", opacity: "0.36" },
        { offset: "46%", color: "#18a9b8", opacity: "0.18" },
        { offset: "100%", color: "#18a9b8", opacity: "0.02" },
      ]);
    }

    if (!area && index === 0) {
      area = document.createElementNS(svgNamespace, "path");
      area.classList.add("chart-gradient-area");
      area.dataset.seriesIndex = String(index);
      area.setAttribute("stroke", "none");
      area.setAttribute("pointer-events", "none");

      const lineLayer = line.closest("g");
      if (lineLayer?.parentNode) {
        lineLayer.parentNode.insertBefore(area, lineLayer);
      } else {
        svg.insertBefore(area, line);
      }
    }

    if (!area) return;
    if (index === 0) area.setAttribute("fill", `url(#${gradientId})`);
    area.setAttribute("d", `${line.getAttribute("d")} L${coords.lastX},${bounds.bottom} L${coords.firstX},${bounds.bottom} Z`);
  }

  function styleTrendLine(line, index) {
    line.classList.add("chart-polished-line");
    if (index === 0) {
      line.setAttribute("stroke", "var(--color-primary)");
      line.setAttribute("stroke-width", "3");
      line.removeAttribute("stroke-dasharray");
      line.style.strokeDasharray = "none";
      line.style.opacity = "1";
      return;
    }

    if (index === 1) {
      line.setAttribute("stroke", "#4f7fa8");
      line.setAttribute("stroke-width", "2.1");
      line.setAttribute("stroke-dasharray", "6 8");
      line.style.opacity = "0.72";
      return;
    }

    line.setAttribute("stroke", "#d6a94a");
    line.setAttribute("stroke-width", "1.8");
    line.removeAttribute("stroke-dasharray");
    line.style.strokeDasharray = "none";
    line.style.opacity = "0.58";
  }

  function hideZeroYAxisTick(svg, bounds) {
    numericTicks(svg).forEach((tick) => {
      if (tick.value === 0 && tick.x < bounds.left) {
        tick.node.style.display = "none";
      }
    });
  }

  function updateLineNodes(svg, line, index) {
    const group = svg.querySelector(`.chart-line-nodes[data-series-index="${index}"]`);
    if (!group) return;

    if (index !== 0) {
      group.innerHTML = "";
      group.style.display = "none";
      return;
    }

    const points = getPathPoints(line);
    group.innerHTML = "";
    points.forEach((point, pointIndex) => {
      const circle = document.createElementNS(svgNamespace, "circle");
      circle.classList.add("chart-line-node");
      circle.setAttribute("cx", point.x.toFixed(2));
      circle.setAttribute("cy", point.y.toFixed(2));
      circle.setAttribute("r", "3.8");
      group.appendChild(circle);
    });
  }

  function applyTrendReveal(svg) {
    svg.querySelectorAll("clipPath[data-chart-trend-clip]").forEach((clip) => clip.remove());
    svg.querySelectorAll(".chart-gradient-area").forEach((area) => {
      area.removeAttribute("clip-path");
    });
    delete svg.dataset.trendRevealSignature;
  }

  function updateTrendChart(card) {
    if (renderNativeTrendChart(card)) return;

    const svg = card.querySelector(".recharts-wrapper svg");
    if (!svg) return;

    const lines = [...svg.querySelectorAll("path.recharts-line-curve")];
    if (!lines.length) return;

    const bounds = plotBounds(svg, lines[0]);
    const scaleY = yScale(svg, bounds);
    const data = seriesFor(card);
    const step = (bounds.right - bounds.left) / Math.max(data.labels.length - 1, 1);
    const series = [data.current, data.previous, data.target];

    lines.forEach((line, index) => {
      const values = series[index];
      if (!values) return;
      const points = values.map((value, pointIndex) => ({
        x: bounds.left + step * pointIndex,
        y: scaleY(value),
      }));
      line.setAttribute("d", smoothPath(points));
      line.style.display = appState.comparison === "No comparison" && index > 0 ? "none" : "";
      if (appState.comparison === "vs. Target" && index === 1) line.style.display = "none";
      styleTrendLine(line, index);
      updateArea(svg, line, index, bounds);
      updateLineNodes(svg, line, index);
    });

    svg.querySelectorAll(".chart-gradient-area").forEach((area, index) => {
      area.style.display = index === 0 ? "" : "none";
    });
    svg.querySelectorAll(".chart-line-nodes").forEach((group, index) => {
      group.style.display = index === 0 ? "" : "none";
    });

    updateXAxisTicks(svg, data.labels, bounds);
    hideZeroYAxisTick(svg, bounds);
    applyTrendReveal(svg, svg.dataset.chartVisualIndex);
    card.dataset.renderedRange = card.dataset.trendRange || defaultRange;
    card.dataset.renderedBranch = appState.branch;
    card.dataset.renderedComparison = appState.comparison;
  }

  function addGradientDef(svg, id, stops) {
    let defs = svg.querySelector("defs");
    if (!defs) {
      defs = document.createElementNS(svgNamespace, "defs");
      svg.insertBefore(defs, svg.firstChild);
    }

    svg.querySelector(`#${id}`)?.remove();

    const gradient = document.createElementNS(svgNamespace, "linearGradient");
    gradient.id = id;
    gradient.setAttribute("x1", "0");
    gradient.setAttribute("x2", "0");
    gradient.setAttribute("y1", "0");
    gradient.setAttribute("y2", "1");

    for (const stop of stops) {
      const stopNode = document.createElementNS(svgNamespace, "stop");
      stopNode.setAttribute("offset", stop.offset);
      stopNode.setAttribute("stop-color", stop.color);
      stopNode.setAttribute("stop-opacity", stop.opacity);
      gradient.appendChild(stopNode);
    }

    defs.appendChild(gradient);
  }

  function decorateLinePaths(linePaths) {
    linePaths.forEach((line, index) => {
      styleTrendLine(line, index);
    });
  }

  function enhanceLineChart(svg, chartIndex) {
    const linePaths = [...svg.querySelectorAll("path.recharts-line-curve")];
    if (!linePaths.length) return;
    svg.dataset.chartVisualIndex = String(chartIndex);

    if (svg.dataset.gradientEnhanced !== "true") {
      const bounds = plotBounds(svg, linePaths[0]);
      const primaryId = `chart-soft-primary-${chartIndex}`;
      const mutedId = `chart-soft-muted-${chartIndex}`;
      addGradientDef(svg, primaryId, [
        { offset: "0%", color: "var(--color-primary)", opacity: "0.34" },
        { offset: "48%", color: "var(--color-primary)", opacity: "0.18" },
        { offset: "100%", color: "var(--color-primary)", opacity: "0.03" },
      ]);
      addGradientDef(svg, mutedId, [
        { offset: "0%", color: "var(--color-chart-2)", opacity: "0.16" },
        { offset: "100%", color: "var(--color-chart-2)", opacity: "0" },
      ]);

      const referenceNode = svg.querySelector(".recharts-cartesian-grid") || svg.firstChild;
      linePaths.slice(0, 1).forEach((line, index) => {
        const coordinates = getPathCoordinates(line);
        if (!coordinates) return;

        const area = document.createElementNS(svgNamespace, "path");
        area.classList.add("chart-gradient-area");
        area.dataset.seriesIndex = String(index);
        area.setAttribute("d", `${line.getAttribute("d")} L${coordinates.lastX},${bounds.bottom} L${coordinates.firstX},${bounds.bottom} Z`);
        area.setAttribute("fill", `url(#${index === 0 ? primaryId : mutedId})`);
        area.setAttribute("stroke", "none");
        area.setAttribute("pointer-events", "none");
        svg.insertBefore(area, referenceNode?.nextSibling || svg.firstChild);
      });

      linePaths.slice(0, 1).forEach((line, index) => {
        const group = document.createElementNS(svgNamespace, "g");
        group.classList.add("chart-line-nodes");
        group.dataset.seriesIndex = String(index);
        group.setAttribute("pointer-events", "none");
        svg.appendChild(group);
        updateLineNodes(svg, line, index);
      });

      svg.dataset.gradientEnhanced = "true";
      applyTrendReveal(svg, chartIndex, true);
    }

    decorateLinePaths(linePaths);
  }

  function enhanceBarChart(svg, chartIndex) {
    const bars = [...svg.querySelectorAll("path.recharts-rectangle")];
    if (!bars.length) return;
    const cardTitle = findCardTitle(chartCardForSvg(svg))?.textContent.trim() || "";

    svg.querySelectorAll(`clipPath[data-chart-bar-clip="${chartIndex}"]`).forEach((clip) => clip.remove());

    const boxes = bars
      .map((bar) => {
        try {
          return { bar, box: bar.getBBox() };
        } catch {
          return null;
        }
      })
      .filter((item) => item?.box.width && item.box.height);
    if (!boxes.length) return;

    const horizontalCount = boxes.filter(({ box }) => box.width > box.height * 1.35).length;
    const horizontal = horizontalCount > boxes.length / 2;

    svg.classList.add("chart-bars-ready");
    svg.dataset.barOrientation = horizontal ? "horizontal" : "vertical";

    boxes.forEach(({ bar }) => {
      bar.removeAttribute("clip-path");
      bar.classList.remove("chart-bar-reveal", "chart-bar-reveal--horizontal", "chart-bar-reveal--vertical");
      bar.style.removeProperty("--bar-delay");
      bar.style.opacity = "1";
      bar.style.transform = "none";
      if (/OPD volume by hour/i.test(cardTitle)) {
        const fill = `${bar.getAttribute("fill") || bar.style.fill || ""}`.toLowerCase();
        if (!fill.includes("primary") && !fill.includes("14a") && !fill.includes("16a") && !fill.includes("teal")) {
          bar.style.fill = "color-mix(in oklab, var(--color-chart-4) 38%, var(--color-surface))";
          bar.style.opacity = "1";
        }
      }
    });
  }

  function chartCardForSvg(svg) {
    return (
      svg.closest(".rounded-2xl.border.bg-surface") ||
      svg.closest(".rounded-2xl") ||
      svg.parentElement?.closest(".rounded-2xl") ||
      svg.parentElement?.parentElement
    );
  }

  function enhanceChartVisuals() {
    document.querySelectorAll(".native-trend-host").forEach((host) => {
      const card = host.closest(".rounded-2xl");
      if (card) renderNativeTrendChart(card);
    });

    [...document.querySelectorAll(".recharts-wrapper svg")].forEach((svg, index) => {
      if (svg.querySelector("path.recharts-line-curve")) {
        const card = chartCardForSvg(svg);
        if (card && renderNativeTrendChart(card)) return;
        enhanceLineChart(svg, index);
        if (card) updateTrendChart(card);
      } else if (svg.querySelector("path.recharts-rectangle")) {
        enhanceBarChart(svg, index);
      }
    });
  }

  function disableChartMotion(scope = document) {
    scope.querySelectorAll?.(".recharts-wrapper svg animate, .recharts-wrapper svg animateTransform, .recharts-wrapper svg animateMotion").forEach((node) => {
      node.remove();
    });

    scope.querySelectorAll?.(".recharts-wrapper *, .chart-gradient-area, .chart-line-node, .chart-bar-reveal").forEach((node) => {
      node.style.animation = "none";
      node.style.transition = "none";
      node.style.transform = "none";
      node.style.willChange = "auto";
    });

    scope.querySelectorAll?.("path.recharts-rectangle, .recharts-sector").forEach((node) => {
      node.removeAttribute("clip-path");
      node.classList.remove("chart-bar-reveal", "chart-bar-reveal--horizontal", "chart-bar-reveal--vertical");
      node.style.opacity = "1";
      node.style.transform = "none";
    });
  }

  function findGlobalControl(button) {
    const label = button.innerText.replace(/\s+/g, " ").trim();
    return globalControls.find((control) => control.match.test(label));
  }

  function setButtonLabel(button, label) {
    for (const node of button.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        if (node.textContent === label) return;
        node.textContent = label;
        return;
      }
    }
    button.insertBefore(document.createTextNode(label), button.lastElementChild || null);
  }

  function closeControlMenus(except) {
    document.querySelectorAll(".global-control-menu").forEach((menu) => {
      if (menu !== except) menu.remove();
    });
    document.querySelectorAll("header button[aria-expanded='true']").forEach((button) => {
      if (!except || button.nextElementSibling !== except) button.setAttribute("aria-expanded", "false");
    });
  }

  function removeGlobalComparisonControl() {
    document.querySelectorAll("header button").forEach((button) => {
      const label = button.innerText.replace(/\s+/g, " ").trim();
      if (!globalComparisonPattern.test(label)) return;
      if (button.nextElementSibling?.classList?.contains("global-control-menu")) {
        button.nextElementSibling.remove();
      }
      if (button.isConnected) button.remove();
    });
  }

  function createControlMenu(button, control) {
    const existing = button.parentElement.querySelector(":scope > .global-control-menu");
    if (existing) {
      existing.remove();
      button.setAttribute("aria-expanded", "false");
      return;
    }

    closeControlMenus();
    const menu = document.createElement("div");
    menu.className = "global-control-menu";
    menu.setAttribute("role", "menu");
    const rect = button.getBoundingClientRect();
    const menuWidth = Math.max(rect.width, 190);
    const left = Math.min(rect.left, window.innerWidth - menuWidth - 12);
    menu.style.setProperty("--control-menu-left", `${Math.max(12, left)}px`);
    menu.style.setProperty("--control-menu-top", `${rect.bottom + 8}px`);
    menu.style.setProperty("--control-menu-width", `${menuWidth}px`);

    for (const option of control.options) {
      const item = document.createElement("button");
      item.type = "button";
      item.setAttribute("role", "menuitemradio");
      item.setAttribute("aria-checked", String(appState[control.kind] === option));
      item.textContent = option;
      item.addEventListener("click", () => {
        if (control.kind === "timeframe") {
          setGlobalTimeframe(option);
          const mappedRange = rangeForTimeframe(option);
          document.querySelectorAll(".trend-range-picker").forEach((picker) => {
            const card = picker.closest(".rounded-2xl");
            if (card) card.dataset.trendRange = mappedRange;
          });
        } else {
          appState[control.kind] = option;
        }
        setButtonLabel(button, option);
        closeControlMenus();
        runWithObserverPaused(refreshInteractiveCharts);
      });
      menu.appendChild(item);
    }

    button.setAttribute("aria-haspopup", "menu");
    button.setAttribute("aria-expanded", "true");
    button.parentElement.classList.add("global-control-anchor");
    button.insertAdjacentElement("afterend", menu);
  }

  function enhanceGlobalControls() {
    removeGlobalComparisonControl();
    replaceGlobalExportWithSearch();
    const buttons = [...document.querySelectorAll("header button")];
    for (const button of buttons) {
      if (button.closest(".global-control-menu")) continue;
      const control = findGlobalControl(button);
      if (!control || button.dataset.globalControl === "true") continue;
      button.dataset.globalControl = "true";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        createControlMenu(button, control);
      });
    }

    updateGlobalControlLabels();
  }

  function replaceGlobalExportWithSearch() {
    const header = document.querySelector("header");
    if (!header) return;
    const exportButton = [...header.querySelectorAll("button")].find((button) => {
      if (button.closest(".global-control-menu")) return false;
      return /^Export$/i.test(button.textContent.replace(/\s+/g, " ").trim());
    });
    const existingSearch = header.querySelector(".global-search-control");
    if (existingSearch) {
      if (exportButton) exportButton.remove();
      return;
    }
    if (!exportButton) return;

    const search = document.createElement("label");
    search.className = "global-search-control";
    search.innerHTML = `
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
        <path d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
      <input type="search" aria-label="Search dashboard" placeholder="Search" />
    `;
    exportButton.replaceWith(search);
  }

  function normalizeNotificationUi() {
    const watchlistCounts = {
      alerts: 5,
      updates: 0,
    };
    const watchlistTotal = watchlistCounts.alerts + watchlistCounts.updates;

    document.querySelectorAll("header button").forEach((button) => {
      button.querySelectorAll("*").forEach((node) => {
        if (!node.children.length && /^\d+$/.test(node.textContent.trim())) {
          node.classList.add("notification-badge-alert");
          node.textContent = String(watchlistTotal);
        }
      });
    });

    document.querySelectorAll("aside, [role='dialog'], .fixed").forEach((panel) => {
      panel.querySelectorAll("button, [role='tab']").forEach((node) => {
        const label = (node.dataset.notificationSegment || node.textContent).replace(/\s+/g, " ").trim().toLowerCase();
        if (/^(attention|alerts)\s*\d*$/.test(label)) {
          node.dataset.notificationSegment = "alerts";
          node.classList.add("notification-segment-tab");
          node.innerHTML = `<span>Alerts</span><span class="notification-segment-count">${watchlistCounts.alerts}</span>`;
        }
        if (/^(notifications|updates)\s*\d*$/.test(label)) {
          node.dataset.notificationSegment = "updates";
          node.classList.add("notification-segment-tab");
          node.innerHTML = `<span>Updates</span><span class="notification-segment-count">${watchlistCounts.updates}</span>`;
        }
      });

      panel.querySelectorAll("span, p, div").forEach((node) => {
        if (node.children.length) return;
        const text = node.textContent.replace(/\s+/g, " ").trim();
        if (/^(ceo|coo|hr admin|hr_admin)?\s*workspace$/i.test(text)) node.remove();
        if (zyephrDerived) {
          const focus = derivedRiskBranches(4);
          const first = focus[0] || v2Branches[0] || {};
          const second = focus[1] || v2Branches[1] || first;
          const third = focus[2] || v2Branches[2] || second;
          const fourth = focus[3] || v2Branches[3] || third;
          const replacements = [
            [/Bed pressure rising in Westside/i, `Bed pressure review at ${first.name}`],
            [/Discharge TAT breaching at Central/i, `Discharge flow watch at ${second.name}`],
            [/Dialysis utilization dipped at Riverside/i, `Dialysis utilization watch at ${third.name}`],
            [/Emergency volume spike, Northgate/i, `Emergency volume watch, ${fourth.name}`],
            [/92\.1% occupancy · \+3\.2pp vs yesterday/i, `${Number(first.occupancy || 0).toFixed(1)}% occupancy · ${Number(first.alos || 0).toFixed(2)}d ALOS`],
            [/5\.4h average · target 4\.0h/i, `${Number(second.edDoorToDoctor || 0).toFixed(1)}m ED door-to-doctor`],
            [/68\.2% · -4\.1pp vs 7-day avg/i, `${Number(third.dialysis || 0).toFixed(1)}% completion · ${Number(third.dialysisComplicationRate || 0).toFixed(1)}% complications`],
            [/\+22% vs same hour last week/i, `${Number(fourth.edVisits || 0).toLocaleString("en-IN")} ED visits`],
          ];
          for (const [pattern, replacement] of replacements) {
            if (pattern.test(node.textContent)) {
              node.textContent = replacement;
              break;
            }
          }
        }
      });
    });
  }

  function normalizeDashboardLinkActions() {
    const actions = document.querySelectorAll(
      "main a, main button, aside a, aside button, [role='dialog'] a, [role='dialog'] button, .fixed a, .fixed button",
    );
    actions.forEach((node) => {
      if (node.closest(".global-control-menu") || node.matches("[role='tab']")) return;
      const text = node.textContent.replace(/\s+/g, " ").trim();
      const className = String(node.className || "");
      if (/→/.test(text) || node.matches("a") || className.includes("text-primary")) {
        node.classList.add("dashboard-link-action");
      }
    });
  }

  function updateGlobalControlLabels() {
    const buttons = [...document.querySelectorAll("header button[data-global-control='true']")].filter(
      (button) => !button.closest(".global-control-menu"),
    );
    for (const button of buttons) {
      const control = findGlobalControl(button);
      if (control) setButtonLabel(button, appState[control.kind]);
    }
  }

  const v2PageConfig = {
    CEO: {
      "/finance": {
        title: "Financial Performance",
        description: "Understand revenue, margin, collections, patient mix, service conversion, and source-level contribution.",
        tabs: [
          ["revenue-analysis", "Revenue Analysis"],
          ["ebitda-margin", "EBITDA / Margin"],
          ["payor-collections", "Payor & Collections"],
          ["patient-mix", "Patient Mix"],
          ["service-conversion", "Service Conversion"],
          ["revenue-drilldown", "Revenue Drilldown"],
        ],
      },
      "/branches": {
        title: "Branch Comparison",
        description: "Compare branch performance, contribution, capacity, service performance, and risk.",
        tabs: [
          ["performance", "Performance"],
          ["financial-contribution", "Financial Contribution"],
          ["capacity", "Capacity"],
          ["service-performance", "Service Performance"],
          ["risk", "Risk"],
          ["branch-detail", "Branch Detail"],
        ],
      },
      "/capacity-flow": {
        title: "Capacity & Patient Flow",
        description: "Understand whether network capacity is being used efficiently.",
        tabs: [
          ["occupancy", "Occupancy"],
          ["alos", "ALOS"],
          ["admissions-discharges", "Admissions & Discharges"],
          ["delay-contributors", "Delay Contributors"],
        ],
      },
      "/dialysis-program": {
        title: "Dialysis Program",
        description: "Summarize utilization, sessions, missed treatments, and dialysis business contribution.",
        tabs: [
          ["utilization", "Utilization"],
          ["sessions", "Sessions"],
          ["missed-sessions", "Missed Sessions"],
          ["business-contribution", "Business Contribution"],
        ],
      },
      "/reports": {
        title: "Reports Library",
        description: "Generate, download, and schedule executive and operations reports.",
        hideTabs: true,
        tabs: [
          ["ready", "Ready"],
          ["scheduled", "Scheduled"],
          ["templates", "Templates"],
          ["exports", "Exports"],
        ],
      },
    },
    COO: {
      "/operations": {
        title: "Operations",
        description: "Manage patient flow, bed pressure, discharge blockers, staffing coverage, and procedure execution.",
        tabs: [
          ["patient-flow", "Patient Flow"],
          ["bed-capacity", "Bed Capacity"],
          ["discharge-flow", "Discharge Flow"],
          ["staffing", "Staffing"],
          ["procedures", "Procedures"],
        ],
      },
      "/dialysis-program": {
        title: "Dialysis Program",
        description: "Manage dialysis execution, shift utilization, machine availability, and exceptions.",
        tabs: [
          ["utilization", "Utilization"],
          ["sessions", "Sessions"],
          ["machines", "Machines"],
          ["exceptions", "Exceptions"],
        ],
      },
      "/revenue-cycle-ops": {
        title: "Revenue Cycle Operations",
        description: "Track billing and claims blockers that affect discharge, cash flow, and operational closure.",
        tabs: [
          ["billing-queue", "Billing Queue"],
          ["claims-aging", "Claims Aging"],
          ["discharge-billing", "Discharge Billing"],
          ["payer-blockers", "Payer Blockers"],
          ["missing-documents", "Missing Documents"],
        ],
      },
      "/branches": {
        title: "Branch Comparison",
        description: "Compare operational performance, service demand, capacity pressure, dialysis, and staffing across branches.",
        tabs: [
          ["ops-ranking", "Ops Ranking"],
          ["patient-flow", "Patient Flow"],
          ["capacity", "Capacity"],
          ["dialysis", "Dialysis"],
          ["staffing", "Staffing"],
          ["service-performance", "Service Performance"],
          ["branch-detail", "Branch Detail"],
        ],
      },
      "/reports": {
        title: "Reports Library",
        description: "Generate, download, and schedule executive and operations reports.",
        hideTabs: true,
        tabs: [
          ["ready", "Ready"],
          ["scheduled", "Scheduled"],
          ["templates", "Templates"],
          ["exports", "Exports"],
        ],
      },
    },
    HR_ADMIN: {
      "/hrms": {
        title: "HRMS",
        description: "Manage staff, departments, onboarding, biometrics, and HR access controls.",
        hideTabs: true,
        tabs: [
          ["overview", "Overview"],
          ["staff", "Staff"],
          ["departments", "Departments"],
          ["access", "Roles & Access"],
        ],
      },
      "/reports": {
        title: "Reports Library",
        description: "Generate and schedule HR-scoped staff, attendance, onboarding, and compliance reports.",
        hideTabs: true,
        tabs: [
          ["ready", "Ready"],
          ["scheduled", "Scheduled"],
          ["templates", "Templates"],
          ["exports", "Exports"],
        ],
      },
    },
  };

  const v2Branches = zyephrDerived?.branches || [
    { name: "Westside", revenue: 9.8, margin: 24.6, occupancy: 86.5, alos: 4.2, opd: 1280, dialysis: 91, staffing: 97, risk: "Low" },
    { name: "Eastview", revenue: 8.7, margin: 23.2, occupancy: 84.1, alos: 4.0, opd: 1160, dialysis: 88, staffing: 94, risk: "Low" },
    { name: "Northgate", revenue: 7.6, margin: 21.1, occupancy: 82.3, alos: 4.3, opd: 980, dialysis: 84, staffing: 91, risk: "Medium" },
    { name: "Southpoint", revenue: 6.1, margin: 19.6, occupancy: 85.0, alos: 4.6, opd: 840, dialysis: 79, staffing: 88, risk: "Low" },
    { name: "Central", revenue: 5.4, margin: 18.4, occupancy: 80.2, alos: 4.5, opd: 790, dialysis: 73, staffing: 82, risk: "High" },
    { name: "Riverside", revenue: 5.2, margin: 17.8, occupancy: 78.1, alos: 5.0, opd: 720, dialysis: 69, staffing: 79, risk: "High" },
  ];

  const v2Departments = zyephrDerived?.serviceLines || [
    { name: "In-centre dialysis", value: 48, female: 15, male: 29, unmapped: 4, visits: 1840, conversion: 82, growth: 8.7 },
    { name: "Nephrology OPD", value: 44, female: 13, male: 28, unmapped: 3, visits: 1280, conversion: 76, growth: 6.4 },
    { name: "Renal ICU", value: 41, female: 17, male: 21, unmapped: 3, visits: 1325, conversion: 79, growth: 5.9 },
    { name: "Kidney transplant workup", value: 32, female: 10, male: 20, unmapped: 2, visits: 760, conversion: 71, growth: 4.8 },
    { name: "Vascular access procedures", value: 27, female: 8, male: 17, unmapped: 2, visits: 610, conversion: 69, growth: 3.2 },
    { name: "Renal diagnostics", value: 24, female: 9, male: 13, unmapped: 2, visits: 890, conversion: 73, growth: 2.8 },
    { name: "Pharmacy & ESA therapy", value: 21, female: 12, male: 8, unmapped: 1, visits: 940, conversion: 67, growth: 2.1 },
    { name: "Home dialysis / CAPD", value: 17, female: 7, male: 9, unmapped: 1, visits: 680, conversion: 64, growth: 1.4 },
  ];

  const v2Trend = zyephrDerived?.monthly || [
    { label: "Jan", net: 42, previous: -2.3, same: 5.8 },
    { label: "Feb", net: 41, previous: -8.7, same: -3.4 },
    { label: "Mar", net: 45, previous: 8.7, same: -18.6 },
    { label: "Apr", net: 45, previous: 16.2, same: 1.8 },
    { label: "May", net: 40, previous: -4.8, same: 6.1 },
    { label: "Jun", net: 43, previous: 6.4, same: -17.8 },
    { label: "Jul", net: 36, previous: -56.0, same: 2.9 },
    { label: "Aug", net: 45, previous: -1.0, same: 0.2 },
    { label: "Sep", net: 48, previous: -2.1, same: -1.2 },
    { label: "Oct", net: 47, previous: -8.4, same: -1.8 },
    { label: "Nov", net: 43, previous: -20.6, same: 7.3 },
    { label: "Dec", net: 49, previous: -10.2, same: -4.4 },
  ];

  const v2Units = ["ICU", "Ward A", "Ward B", "Dialysis Unit", "Procedure Unit", "OPD Clinics"];
  const v2Shifts = ["Morning", "Afternoon", "Evening", "Night"];
  const ceoOverviewChartRanges = {};
  const hrStaff = [
    { name: "Asha Menon", id: "EMP-1048", department: "Nursing", role: "Senior Nurse", branch: "Westside", status: "Active", biometric: "Enrolled", onboarding: "Complete", shift: "Day" },
    { name: "Ravi Kumar", id: "EMP-1052", department: "Dialysis", role: "Technician", branch: "Riverside", status: "Onboarding", biometric: "Pending", onboarding: "Biometrics", shift: "Evening" },
    { name: "Nisha Varma", id: "EMP-1033", department: "ICU", role: "Nurse", branch: "Central", status: "Active", biometric: "Enrolled", onboarding: "Complete", shift: "Night" },
    { name: "Farah Ali", id: "EMP-1061", department: "Revenue Cycle", role: "Claims Executive", branch: "Central", status: "Onboarding", biometric: "Scheduled", onboarding: "Documents", shift: "Day" },
    { name: "Kabir Rao", id: "EMP-1019", department: "Operations", role: "Floor Manager", branch: "Eastview", status: "Active", biometric: "Enrolled", onboarding: "Complete", shift: "Day" },
    { name: "Leena Joseph", id: "EMP-1068", department: "Pharmacy", role: "Pharmacist", branch: "Northgate", status: "Offer", biometric: "Not started", onboarding: "Offer accepted", shift: "Rotational" },
  ];
  const hrDepartments = [
    { name: "Nursing", head: "Asha Menon", staff: 126, open: 8, attendance: 96, biometric: 94, risk: "Low" },
    { name: "Dialysis", head: "Ravi Kumar", staff: 38, open: 5, attendance: 91, biometric: 87, risk: "Watch" },
    { name: "ICU", head: "Nisha Varma", staff: 44, open: 6, attendance: 89, biometric: 92, risk: "Watch" },
    { name: "Operations", head: "Kabir Rao", staff: 52, open: 3, attendance: 95, biometric: 96, risk: "Low" },
    { name: "Revenue Cycle", head: "Farah Ali", staff: 31, open: 4, attendance: 93, biometric: 90, risk: "Low" },
    { name: "Pharmacy", head: "Leena Joseph", staff: 29, open: 2, attendance: 94, biometric: 88, risk: "Low" },
  ];
  const hrOnboardingStages = [
    { name: "Offer accepted", count: 14, owner: "Recruiting", status: "Low" },
    { name: "Documents", count: 9, owner: "HR Ops", status: "Watch" },
    { name: "Medical clearance", count: 6, owner: "Clinical admin", status: "Low" },
    { name: "Biometrics", count: 11, owner: "HRMS admin", status: "High" },
    { name: "System access", count: 7, owner: "IT support", status: "Watch" },
  ];
  const hrRoleTemplates = ["Senior Nurse", "Technician", "Floor Manager", "Claims Executive", "Pharmacist", "HR Executive"];
  const hrBranches = zyephrBranchNames;

  function v2Params() {
    return new URLSearchParams(window.location.search);
  }

  function v2RouteConfig(role, path) {
    return v2PageConfig[role]?.[path] || null;
  }

  function v2DefaultTab(config) {
    return config?.tabs?.[0]?.[0] || "library";
  }

  function v2TabLabel(config, tab) {
    return config?.tabs?.find(([id]) => id === tab)?.[1] || tab.replace(/-/g, " ");
  }

  function syncV2ShellChrome(config) {
    const title = config.title;
    const header = document.querySelector("main > header");

    if (header) {
      const headerTitle = header.querySelector("h1");
      if (headerTitle && headerTitle.textContent !== title) {
        headerTitle.textContent = title;
      }

      const breadcrumbCurrent =
        [...header.querySelectorAll("span")].find((span) => {
          const text = span.textContent.replace(/\s+/g, " ").trim();
          return text && text !== "Executive Dashboard" && span.className.includes("text-foreground");
        }) || [...header.querySelectorAll("span")].filter((span) => span.childElementCount === 0).at(-1);

      if (breadcrumbCurrent && breadcrumbCurrent.textContent.trim() !== title) {
        breadcrumbCurrent.textContent = title;
      }
    }

    const desiredDocumentTitle = `${title} · ZyephrOS`;
    if (document.title !== desiredDocumentTitle) {
      document.title = desiredDocumentTitle;
    }
  }

  function v2RoleForPage() {
    const path = currentPath();
    const tab = v2Params().get("tab") || "";
    if (path === "/branches") return explicitRoleParam() || branchRoleFromTab(tab) || activeRole();
    return activeRole();
  }

  function v2InternalRoute() {
    const path = currentPath();
    if (path === "/quality-safety") return false;
    return path !== "/overview" && Boolean(v2RouteConfig("CEO", path) || v2RouteConfig("COO", path) || v2RouteConfig("HR_ADMIN", path));
  }

  function v2UpdateUrl(params) {
    const url = new URL(window.location.href);
    const role = normalizeRole(params.role) || explicitRoleParam() || storedRole() || activeRole();
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    });
    if (role) url.searchParams.set("role", role);
    window.history.pushState({}, "", `${url.pathname}?${url.searchParams.toString()}`.replace(/\?$/, ""));
    scheduleEnhance();
  }

  function v2StatusTone(status) {
    if (/high|risk|blocked|critical|delayed|restricted/i.test(status)) return "high";
    if (/medium|watch|pending|gap|review/i.test(status)) return "medium";
    return "low";
  }

  function v2Pill(status) {
    return `<span class="v2-status v2-status--${v2StatusTone(status)}">${escapeHtml(status)}</span>`;
  }

  function closeV2LocalMenus(container, except) {
    container.querySelectorAll(".v2-local-menu").forEach((menu) => {
      if (menu !== except) menu.hidden = true;
    });
    container.querySelectorAll("[data-v2-local-filter][aria-expanded='true']").forEach((button) => {
      if (!except || button.nextElementSibling !== except) button.setAttribute("aria-expanded", "false");
    });
  }

  function v2MetricCards(metrics) {
    return `
      <div class="v2-metric-grid">
        ${metrics
          .map(
            (metric) => `
              <div class="v2-metric-card">
                <span>${escapeHtml(metric.label)}</span>
                <strong>${escapeHtml(metric.value)}</strong>
                <em>${escapeHtml(metric.delta || metric.note || "")}</em>
              </div>
            `,
          )
          .join("")}
      </div>
    `;
  }

  function v2FilterBar() {
    return `
      <div class="v2-filter-row">
        <button type="button" data-v2-filter-cycle="branch"><span>Branch</span><strong>${escapeHtml(appState.branch)}</strong></button>
        <button type="button" data-v2-filter-cycle="timeframe"><span>Date range</span><strong>${escapeHtml(appState.timeframe)}</strong></button>
        <button type="button" data-v2-filter-cycle="comparison"><span>Comparison</span><strong>${escapeHtml(appState.comparison)}</strong></button>
        <button type="button" data-v2-reset-filters>Reset</button>
      </div>
    `;
  }

  function v2Tabs(config, activeTab) {
    return `
      <div class="v2-tabs" role="tablist">
        ${config.tabs
          .map(
            ([id, label]) => `
              <button type="button" role="tab" data-v2-tab="${escapeHtml(id)}" aria-selected="${String(id === activeTab)}">
                ${escapeHtml(label)}
              </button>
            `,
          )
          .join("")}
      </div>
    `;
  }

  function v2PageShell(role, config, tab, body) {
    const hrmsMeta = role === "HR_ADMIN" && currentPath() === "/hrms" ? hrmsPageMeta(tab) : null;
    const title = hrmsMeta?.title || config.title;
    const description = hrmsMeta?.description || config.description;
    const suppressHeader = role === "HR_ADMIN" && currentPath() === "/hrms" && ["staff", "departments"].includes(normalizeHrmsTab(tab));
    return `
      <section class="v2-foundation" data-v2-role="${escapeHtml(role)}">
        ${
          suppressHeader
            ? ""
            : `<header class="v2-page-header">
          <div>
            <h1>${escapeHtml(title)}</h1>
            <p>${escapeHtml(description)}</p>
          </div>
        </header>`
        }
        ${config.hideTabs ? "" : `<div class="v2-toolbar">${v2Tabs(config, tab)}</div>`}
        ${body}
      </section>
    `;
  }

  function v2ContributionRows(role, field) {
    if (/branch/i.test(field)) {
      const derivedCenters = zyephrDerived?.financeDrilldownData?.Center;
      if (derivedCenters?.length) {
        return derivedCenters.map((row) => {
          const branch = v2Branches.find((item) => item.name === row.label) || {};
          return {
            name: row.label,
            value: row.total,
            female: row.female,
            male: row.male,
            unmapped: row.unmapped,
            visits: branch.patientVolume || branch.opd || 0,
            conversion: branch.collectionRate || branch.dialysis || 0,
            growth: branch.revenueGrowth || 0,
          };
        });
      }
      return v2Branches.map((branch) => ({
        name: branch.name,
        value: branch.revenue * 5,
        female: branch.revenue * 1.6,
        male: branch.revenue * 2.9,
        unmapped: branch.revenue * 0.5,
        visits: branch.opd,
        conversion: branch.dialysis,
        growth: branch.margin - 16,
      }));
    }
    if (/doctor|consultant/i.test(field)) {
      if (zyephrDerived?.doctors?.length) return zyephrDerived.doctors;
      const names =
        role === "COO"
          ? ["Consultant A", "Consultant B", "Consultant C", "Consultant D", "Consultant E", "Consultant F"]
          : ["Dr. Nair", "Dr. Menon", "Dr. Kapoor", "Dr. Iyer", "Dr. Shah", "Dr. Fernandes"];
      return names.map((name, index) => ({
        name,
        value: [31, 28, 24, 19, 16, 12][index],
        female: [9, 8, 7, 6, 5, 4][index],
        male: [19, 17, 14, 11, 9, 7][index],
        unmapped: [3, 3, 3, 2, 2, 1][index],
        visits: [560, 510, 430, 380, 310, 260][index],
        conversion: [78, 74, 71, 69, 66, 63][index],
        growth: [7.2, 5.8, 4.6, 2.9, 1.4, -1.1][index],
        restricted: role === "COO" || index > 2,
      }));
    }
    if (/demographic|patient/i.test(field)) {
      if (zyephrDerived?.demographics?.length) return zyephrDerived.demographics;
      return ["Female 31-45", "Male 46-60", "Female 46-60", "Male 31-45", "Senior 60+", "New patients"].map((name, index) => ({
        name,
        value: [39, 34, 31, 26, 21, 18][index],
        female: [30, 3, 24, 4, 10, 8][index],
        male: [6, 28, 4, 19, 9, 7][index],
        unmapped: [3, 3, 3, 3, 2, 3][index],
        visits: [1320, 1140, 980, 880, 690, 720][index],
        conversion: [76, 72, 69, 68, 61, 64][index],
        growth: [6.9, 5.2, 4.4, 2.8, 1.1, 3.7][index],
      }));
    }
    if (/year|trend/i.test(field)) {
      return ["2026 YTD", "2025", "2024", "2023", "2022", "2021"].map((name, index) => ({
        name,
        value: [286, 512, 466, 421, 386, 348][index],
        female: [98, 178, 162, 144, 132, 119][index],
        male: [171, 306, 278, 252, 232, 209][index],
        unmapped: [17, 28, 26, 25, 22, 20][index],
        visits: [11200, 21400, 19800, 18400, 17200, 16050][index],
        conversion: [78, 75, 73, 71, 68, 65][index],
        growth: [8.7, 6.1, 4.9, 3.7, 2.2, 1.4][index],
      }));
    }
    return v2Departments;
  }

  function v2LocalFilterOptions(role) {
    const derivedDepartments = v2Departments.map((department) => department.name).filter(Boolean);
    const derivedDoctors = zyephrDerived?.doctors?.map((doctor) => doctor.name).filter(Boolean) || [];
    return {
      period: ["MTD", "QTD", "YTD"],
      branchScope: ["All", ...v2Branches.map((branch) => branch.name)],
      department: ["All", ...(derivedDepartments.length ? derivedDepartments : ["In-centre dialysis", "Nephrology OPD", "Renal ICU", "Kidney transplant workup", "Home dialysis / CAPD"])],
      person: ["All", ...(derivedDoctors.length ? derivedDoctors.slice(0, 6) : role === "COO" ? ["Consultant A", "Consultant B", "Consultant C"] : ["Dr. Nair", "Dr. Menon", "Dr. Kapoor"])],
      patientMix: ["All", "OP", "IP", "New", "Repeat"],
    };
  }

  function v2LocalFilterValue(role, key) {
    const options = v2LocalFilterOptions(role)[key] || ["All"];
    const value = v2Params().get(key);
    return options.includes(value) ? value : options[0];
  }

  function v2LocalFilterContext(role) {
    return {
      period: v2LocalFilterValue(role, "period"),
      branchScope: v2LocalFilterValue(role, "branchScope"),
      department: v2LocalFilterValue(role, "department"),
      person: v2LocalFilterValue(role, "person"),
      patientMix: v2LocalFilterValue(role, "patientMix"),
    };
  }

  function v2FilterKeyForField(field) {
    if (/branch/i.test(field)) return "branchScope";
    if (/department|service/i.test(field)) return "department";
    if (/doctor|consultant/i.test(field)) return "person";
    if (/demographic|patient/i.test(field)) return "patientMix";
    if (/year|trend/i.test(field)) return "period";
    return "";
  }

  function v2EffectiveLocalFilterContext(role, field) {
    const context = { ...v2LocalFilterContext(role) };
    const groupedKey = v2FilterKeyForField(field);
    if (groupedKey === "branchScope") context.branchScope = "All";
    if (groupedKey === "department") context.department = "All";
    if (groupedKey === "person") context.person = "All";
    if (groupedKey === "patientMix") context.patientMix = "All";
    if (groupedKey === "period") context.period = "YTD";
    return context;
  }

  function v2LocalFilterStrip(role, field) {
    const context = v2LocalFilterContext(role);
    const personLabel = role === "COO" ? "Consultant" : "Doctor";
    const optionsByKey = v2LocalFilterOptions(role);
    const groupedKey = v2FilterKeyForField(field);
    const chips = [
      ["period", "Period", context.period],
      ["branchScope", "Branch", context.branchScope],
      ["department", "Department", context.department],
      ["person", personLabel, context.person],
      ["patientMix", "Patient Mix", context.patientMix],
    ].filter(([key]) => key !== groupedKey);
    return `
      <div class="v2-control-section v2-control-section--filters">
        <span>Refine slice</span>
        <div class="v2-local-filter-row">
          ${chips
            .map(
              ([key, label, value]) => `
                <div class="v2-local-filter">
                  <button type="button" data-v2-local-filter="${escapeHtml(key)}" aria-haspopup="menu" aria-expanded="false">
                    <span>${escapeHtml(label)}</span>
                    <strong>${escapeHtml(value)}</strong>
                  </button>
                  <div class="v2-local-menu" role="menu" hidden>
                    ${(optionsByKey[key] || ["All"])
                      .map(
                        (option) => `
                          <button type="button" role="menuitemradio" aria-checked="${String(option === value)}" data-v2-local-option="${escapeHtml(key)}" data-v2-local-value="${escapeHtml(option)}">
                            ${escapeHtml(option)}
                          </button>
                        `,
                      )
                      .join("")}
                  </div>
                </div>
              `,
            )
            .join("")}
          <button type="button" class="v2-local-filter v2-local-filter--reset" data-v2-local-reset>
            Reset
          </button>
        </div>
      </div>
    `;
  }

  function v2FilteredContributionRows(role, field) {
    const context = v2EffectiveLocalFilterContext(role, field);
    const periodFactor = { MTD: 0.36, QTD: 0.68, YTD: 1 }[context.period] || 1;
    let factor = periodFactor;
    let rows = v2ContributionRows(role, field).map((row) => ({ ...row }));
    const selectedBranch = v2Branches.find((branch) => branch.name === context.branchScope);
    const selectedDepartment = v2Departments.find((department) => department.name === context.department);

    if (context.branchScope !== "All") {
      if (/branch/i.test(field)) rows = rows.filter((row) => row.name === context.branchScope);
      else factor *= (selectedBranch?.revenue || 8) / 9.8;
    }

    if (context.department !== "All") {
      if (/department/i.test(field)) rows = rows.filter((row) => row.name === context.department);
      else factor *= (selectedDepartment?.value || 32) / 48;
    }

    if (context.person !== "All") {
      if (/doctor|consultant/i.test(field)) rows = rows.filter((row) => row.name === context.person);
      else factor *= 0.52;
    }

    if (context.patientMix !== "All") {
      if (/patient|demographic/i.test(field)) rows = rows.filter((row) => row.name.toLowerCase().includes(context.patientMix.toLowerCase()));
      factor *= { OP: 0.58, IP: 0.42, New: 0.31, Repeat: 0.69 }[context.patientMix] || 1;
    }

    if (!rows.length) rows = v2ContributionRows(role, field).slice(0, 4).map((row) => ({ ...row }));

    return rows
      .map((row) => ({
        ...row,
        value: Math.max(0.4, row.value * factor),
        female: Math.max(0.1, row.female * factor),
        male: Math.max(0.1, row.male * factor),
        unmapped: Math.max(0.1, row.unmapped * factor),
        visits: Math.round(row.visits * factor),
      }))
      .sort((a, b) => b.value - a.value);
  }

  function v2MovementBoard(role, rows, context) {
    const top = rows[0];
    const branchOffset = branchModifiers[appState.branch] ?? 0;
    const trend = financeDrilldownTrend.slice(-12).map((item) => ({
      ...item,
      revenue: Math.max(18, item.revenue + branchOffset),
      prev: item.prev + branchOffset * 0.24,
      same: item.same + branchOffset * 0.18,
    }));
    const revenueMax = Math.max(...trend.map((item) => item.revenue), 1);
    const growthMin = Math.min(-12, ...trend.flatMap((item) => [item.prev, item.same])) - 2;
    const growthMax = Math.max(12, ...trend.flatMap((item) => [item.prev, item.same])) + 2;
    const pathPrev = financeTrendPath(trend.map((item) => item.prev), growthMin, growthMax);
    const pathSame = financeTrendPath(trend.map((item) => item.same), growthMin, growthMax);
    const current = trend[trend.length - 1];
    const previous = trend[trend.length - 2];
    const average = trend.reduce((sum, item) => sum + item.revenue, 0) / trend.length;
    const movementTone = (value) => (value > 2 ? "Lift" : value < -2 ? "Drag" : "Watch");
    const movement =
      role === "COO"
        ? {
            title: "Service volume over time",
            subtitle: "Visits and conversion movement",
            amountLabel: "Service volume",
            amountSuffix: "k",
            amountPrefix: "",
            barLegend: "Visits",
            prevLegend: "Conversion vs previous",
            sameLegend: "Conversion vs plan",
            summary: [
              { label: "Current month", value: `${(current.revenue / 3.2).toFixed(1)}k` },
              { label: "Average month", value: `${(average / 3.2).toFixed(1)}k` },
              { label: "Vs previous", value: `${current.prev > 0 ? "+" : ""}${current.prev.toFixed(1)}%`, status: movementTone(current.prev) },
            ],
            drivers: [
              { label: "Demand lift", value: "+7.8%", detail: `${top.name} OPD`, status: "Lift" },
              { label: "Conversion", value: "+2.1pp", detail: "Nephrology OPD handoff", status: "Lift" },
              { label: "Leakage", value: "14 cases", detail: "No-show and missed follow-up", status: "Drag" },
            ],
          }
        : {
            title: "Revenue over time",
            subtitle: "Net amount and growth rate",
            amountLabel: "Revenue",
            amountSuffix: "Cr",
            amountPrefix: "₹",
            barLegend: "Net revenue",
            prevLegend: "Growth vs previous month",
            sameLegend: zyephrDerived?.financeTrendSameLabel || "Growth vs same month PY",
            summary: [
              { label: "Current month", value: `₹${current.revenue.toFixed(1)}Cr` },
              { label: "Average month", value: `₹${average.toFixed(1)}Cr` },
              { label: "Vs previous", value: `${current.prev > 0 ? "+" : ""}${current.prev.toFixed(1)}%`, status: movementTone(current.prev) },
            ],
            drivers: [
              { label: "Volume", value: "+₹1.2Cr", detail: `${top.name} and ${v2Branches[1]?.name || "second branch"} OPD`, status: "Lift" },
              { label: "Mix / ARPOB", value: "+₹0.6Cr", detail: "Dialysis and repeat OP", status: "Lift" },
              { label: "Collections", value: "-₹0.4Cr", detail: "TPA 90+ aging", status: "Drag" },
            ],
          };
    const filterLabel = [context.period, context.branchScope, context.department, context.person, context.patientMix]
      .filter((item) => item && item !== "All")
      .join(" · ");
    const formatAmount = (value) =>
      role === "COO"
        ? `${(value / 3.2).toFixed(1)}${movement.amountSuffix}`
        : `${movement.amountPrefix}${value.toFixed(value < 10 ? 1 : 0)}${movement.amountSuffix}`;

    return `
      <article class="v2-panel v2-movement-panel v2-movement-panel--time">
        <div class="v2-panel-heading">
          <div>
            <span>${escapeHtml(movement.title)}</span>
          </div>
          <div class="v2-time-legend">
            <span data-segment="net">${escapeHtml(movement.barLegend)}</span>
            <span data-segment="previous">${escapeHtml(movement.prevLegend)}</span>
            <span data-segment="same">${escapeHtml(movement.sameLegend)}</span>
          </div>
        </div>
        <div class="v2-revenue-time-chart" aria-label="${escapeHtml(movement.title)}">
          <div class="v2-revenue-axis" aria-hidden="true">
            <span>${escapeHtml(formatAmount(revenueMax))}</span>
            <span>${escapeHtml(formatAmount(revenueMax * 0.75))}</span>
            <span>${escapeHtml(formatAmount(revenueMax * 0.5))}</span>
          </div>
          <div class="v2-revenue-time-plot">
            ${trend
              .map(
                (item) => {
                  const shortLabel = item.label.replace(" 2026", "").replace(" 2025", "");
                  const prevTone = item.prev >= 0 ? "is-up" : "is-down";
                  const sameTone = item.same >= 0 ? "is-up" : "is-down";
                  const prevCopy = `${item.prev > 0 ? "+" : ""}${item.prev.toFixed(1)}%`;
                  const sameCopy = `${item.same > 0 ? "+" : ""}${item.same.toFixed(1)}%`;
                  return `
                  <button type="button" class="v2-revenue-time-bar" style="--time-height:${Math.max(16, (item.revenue / revenueMax) * 100).toFixed(2)}%" data-v2-drawer="${escapeHtml(item.label)}" data-v2-kind="${escapeHtml(movement.amountLabel)}" data-v2-status="${escapeHtml(item.prev >= 0 ? "Lift" : "Drag")}">
                    <span>${escapeHtml(formatAmount(item.revenue))}</span>
                    <i></i>
                    <em>${escapeHtml(shortLabel)}</em>
                    <span class="v2-revenue-tooltip" aria-hidden="true">
                      <strong>${escapeHtml(shortLabel)}</strong>
                      <span><b>${escapeHtml(movement.amountLabel)}</b><i>${escapeHtml(formatAmount(item.revenue))}</i></span>
                      <span><b>${escapeHtml(movement.prevLegend)}</b><i class="${prevTone}">${escapeHtml(prevCopy)}</i></span>
                      <span><b>${escapeHtml(movement.sameLegend)}</b><i class="${sameTone}">${escapeHtml(sameCopy)}</i></span>
                    </span>
                  </button>
                `;
                },
              )
              .join("")}
            <svg class="v2-revenue-time-lines" viewBox="0 0 1000 180" preserveAspectRatio="none" aria-hidden="true">
              <path class="v2-revenue-prev-line" d="${escapeHtml(pathPrev)}"></path>
              <path class="v2-revenue-same-line" d="${escapeHtml(pathSame)}"></path>
            </svg>
            <div class="v2-revenue-time-line-points">
              ${trend
	                .map((item, index) => {
	                  const shortLabel = item.label.replace(" 2026", "").replace(" 2025", "");
	                  const x = (index / Math.max(trend.length - 1, 1)) * 100;
	                  const prevY = financeTrendPointY(item.prev, growthMin, growthMax);
	                  const sameY = financeTrendPointY(item.same, growthMin, growthMax);
	                  const tooltipShift = index >= trend.length - 2 ? "-92%" : index <= 1 ? "-8%" : "-50%";
	                  const prevTone = item.prev >= 0 ? "is-up" : "is-down";
	                  const sameTone = item.same >= 0 ? "is-up" : "is-down";
	                  const prevCopy = `${item.prev > 0 ? "+" : ""}${item.prev.toFixed(1)}%`;
	                  const sameCopy = `${item.same > 0 ? "+" : ""}${item.same.toFixed(1)}%`;
	                  return `
	                    <button type="button" class="v2-line-point v2-line-point--previous" style="--point-x:${x.toFixed(2)}%; --point-y:${prevY.toFixed(2)}%; --tooltip-shift:${tooltipShift}" aria-label="${escapeHtml(`${shortLabel}, ${movement.prevLegend} ${prevCopy}`)}">
	                      <span class="v2-line-tooltip" aria-hidden="true">
	                        <strong>${escapeHtml(shortLabel)}</strong>
	                        <span><b>${escapeHtml(movement.amountLabel)}</b><i>${escapeHtml(formatAmount(item.revenue))}</i></span>
	                        <span><b>${escapeHtml(movement.prevLegend)}</b><i class="${prevTone}">${escapeHtml(prevCopy)}</i></span>
	                        <span><b>${escapeHtml(movement.sameLegend)}</b><i class="${sameTone}">${escapeHtml(sameCopy)}</i></span>
	                      </span>
	                    </button>
	                    <button type="button" class="v2-line-point v2-line-point--same" style="--point-x:${x.toFixed(2)}%; --point-y:${sameY.toFixed(2)}%; --tooltip-shift:${tooltipShift}" aria-label="${escapeHtml(`${shortLabel}, ${movement.sameLegend} ${sameCopy}`)}">
	                      <span class="v2-line-tooltip" aria-hidden="true">
	                        <strong>${escapeHtml(shortLabel)}</strong>
	                        <span><b>${escapeHtml(movement.amountLabel)}</b><i>${escapeHtml(formatAmount(item.revenue))}</i></span>
	                        <span><b>${escapeHtml(movement.prevLegend)}</b><i class="${prevTone}">${escapeHtml(prevCopy)}</i></span>
	                        <span><b>${escapeHtml(movement.sameLegend)}</b><i class="${sameTone}">${escapeHtml(sameCopy)}</i></span>
	                      </span>
	                    </button>
	                  `;
	                })
                .join("")}
            </div>
          </div>
        </div>
        <div class="v2-time-summary v2-time-summary--bottom">
          ${movement.summary
            .map(
              (item) => `
                <span class="${item.status ? `v2-driver-chip--${v2StatusTone(item.status)}` : ""}">
                  <em>${escapeHtml(item.label)}</em>
                  <strong>${escapeHtml(item.value)}</strong>
                </span>
              `,
            )
            .join("")}
        </div>
      </article>
    `;
  }

  function v2RevenueKpis() {
    const kpis = zyephrDerived?.financeKpis || [
      ["Net Revenue", "₹43.0Cr", "+6.4% vs previous", "good"],
      ["Revenue per Visit", "₹5,388", "+2.1%", "good"],
      ["ARPP", "₹5,999", "On track", "good"],
      ["Lab Visit %", "23.5%", "Watch", "watch"],
    ];
    return kpis
      .map(
        ([label, value, status, tone]) => `
          <article class="v2-revenue-kpi">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
            <b class="is-${escapeHtml(tone)}">${escapeHtml(status)}</b>
          </article>
        `,
      )
      .join("");
  }

  function v2RevenuePerformanceRows(field) {
    if (zyephrDerived?.revenuePerformanceRows?.[field]) return zyephrDerived.revenuePerformanceRows[field];
    const rowsByField = {
      "Service Line": [
        ["In-centre dialysis", "₹17Cr", "19%", "+8.4%", "38%", "Healthy"],
        ["Nephrology OPD", "₹16Cr", "17%", "+6.1%", "34%", "Healthy"],
        ["Renal ICU", "₹15Cr", "16%", "-2.4%", "29%", "Watch"],
        ["Kidney transplant workup", "₹12Cr", "13%", "+3.2%", "31%", "Healthy"],
        ["Vascular access procedures", "₹9.7Cr", "11%", "-4.1%", "27%", "Risk"],
      ],
      Branch: [
        ["Indiranagar", "₹18.6Cr", "31%", "+7.2%", "36%", "Healthy"],
        ["Whitefield", "₹14.2Cr", "24%", "-3.8%", "28%", "Watch"],
        ["Jayanagar", "₹12.8Cr", "22%", "+4.9%", "33%", "Healthy"],
        ["Hebbal", "₹9.8Cr", "17%", "-5.6%", "24%", "Risk"],
      ],
      "Doctor Name": [
        ["Dr. Arvind Rao", "₹8.4Cr", "14%", "+5.1%", "35%", "Healthy"],
        ["Dr. Meera Iyer", "₹7.8Cr", "13%", "+3.6%", "33%", "Healthy"],
        ["Dr. Sanjay Kulkarni", "₹6.9Cr", "11%", "-2.8%", "29%", "Watch"],
        ["Dr. Nisha Menon", "₹5.6Cr", "9%", "+2.4%", "31%", "Healthy"],
        ["Dr. Farhan Ali", "₹4.8Cr", "8%", "-4.2%", "26%", "Risk"],
      ],
      "Patient Mix": [
        ["Repeat CKD cohort", "₹19Cr", "32%", "+6.9%", "37%", "Healthy"],
        ["New OPD patients", "₹13Cr", "22%", "+4.2%", "31%", "Healthy"],
        ["Dialysis maintenance patients", "₹12Cr", "20%", "+7.1%", "36%", "Healthy"],
        ["Insurance IPD patients", "₹9Cr", "15%", "-1.9%", "28%", "Watch"],
        ["Cash OPD patients", "₹6Cr", "10%", "-3.4%", "25%", "Risk"],
      ],
      Year: [
        ["2022", "₹312Cr", "18%", "+8.1%", "29%", "Healthy"],
        ["2023", "₹356Cr", "21%", "+14.1%", "31%", "Healthy"],
        ["2024", "₹402Cr", "24%", "+12.9%", "33%", "Healthy"],
        ["2025", "₹438Cr", "26%", "+9.0%", "34%", "Healthy"],
        ["2026 YTD", "₹241Cr", "14%", "+6.4%", "35%", "Watch"],
      ],
    };
    return rowsByField[field] || rowsByField["Service Line"];
  }

  function v2RevenuePerformanceTable(field) {
    const rows = v2RevenuePerformanceRows(field);
    return `
      <article class="v2-panel v2-revenue-performance">
        <div class="v2-panel-heading">
          <div><span>Performance Breakdown</span></div>
        </div>
        <div class="v2-table-wrap">
          <table class="v2-table" style="--v2-table-min:780px">
            <thead><tr>${["Name", "Revenue", "Contribution", "Growth", "Margin", "Status"].map((header) => `<th>${header}</th>`).join("")}</tr></thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr data-v2-drawer="${escapeHtml(row[0])}" data-v2-kind="Revenue performance" data-v2-status="${escapeHtml(row[5])}">
                      <td>${escapeHtml(row[0])}</td>
                      <td>${escapeHtml(row[1])}</td>
                      <td>${escapeHtml(row[2])}</td>
                      <td class="${row[3].startsWith("-") ? "is-negative" : "is-positive"}">${escapeHtml(row[3])}</td>
                      <td>${escapeHtml(row[4])}</td>
                      <td class="is-status">${v2Pill(row[5])}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </article>
    `;
  }

  function renderRevenueAnalysisWorkspace(role, wrapper) {
    const params = v2Params();
    const fields =
      role === "COO"
        ? ["Service Line", "Branch", "Consultant", "Patient Mix", "Trend"]
        : ["Service Line", "Branch", "Doctor Name", "Patient Mix", "Year"];
    const field = fields.includes(params.get("field")) ? params.get("field") : fields[0];
    const context = v2EffectiveLocalFilterContext(role, field);
    const rows = v2FilteredContributionRows(role, field);
    const max = Math.max(...rows.map((row) => row.value), 1);
    const total = Math.max(rows.reduce((sum, row) => sum + row.value, 0), 1);
    return `
      <section class="v2-revenue-workspace">
        <div class="v2-revenue-kpi-strip">
          ${v2RevenueKpis()}
        </div>

        <div class="v2-revenue-analysis-layout">
          <div class="v2-revenue-main">
            <div class="v2-revenue-controls">
              <div class="v2-control-section v2-control-section--analyze">
                <div class="v2-field-tabs" role="tablist">
                  ${fields
                    .map(
                      (item) => `
                        <button type="button" data-v2-field="${escapeHtml(item)}" aria-selected="${String(item === field)}">
                          ${escapeHtml(item)}
                        </button>
                      `,
                    )
                    .join("")}
                </div>
              </div>
            </div>

            <div class="v2-revenue-grid">
              <article class="v2-panel v2-contribution-panel">
                <div class="v2-panel-heading">
                  <div>
                    <span>${escapeHtml(role === "COO" ? `Service demand by ${field}` : `Revenue by ${field}`)}</span>
                  </div>
                  <div class="v2-mini-legend">
                    <span data-color="pink">${escapeHtml(role === "COO" ? "New" : "Female")}</span>
                    <span data-color="blue">${escapeHtml(role === "COO" ? "Repeat" : "Male")}</span>
                    <span data-color="muted">Other</span>
                  </div>
                </div>
                <div class="v2-contribution-list">
                  ${rows
                    .map((row) => {
                      const rowWidth = Math.max(8, (row.value / max) * 100);
                      const femaleWidth = Math.max(4, (row.female / Math.max(row.value, 0.1)) * 100);
                      const maleWidth = Math.max(4, (row.male / Math.max(row.value, 0.1)) * 100);
                      const unmappedWidth = Math.max(3, (row.unmapped / Math.max(row.value, 0.1)) * 100);
                      const amount = role === "COO" ? `${Math.round(row.visits).toLocaleString()} visits` : `₹${row.value.toFixed(row.value < 10 ? 1 : 0)}Cr`;
                      return `
                        <button type="button" class="v2-contribution-row" data-v2-drawer="${escapeHtml(row.name)}" data-v2-kind="${escapeHtml(field)}" data-v2-status="${row.restricted ? "Restricted" : "Open"}">
                          <span class="v2-contribution-label">
                            <strong>${escapeHtml(row.name)}</strong>
                            <em>${row.restricted ? "Restricted revenue detail" : `${Math.round((row.value / total) * 100)}% of selected ${role === "COO" ? "demand" : "revenue"}`}</em>
                          </span>
                          <span class="v2-contribution-track">
                            <span class="v2-contribution-fill" style="--row-width:${rowWidth.toFixed(2)}%">
                              <i style="--segment-width:${femaleWidth.toFixed(2)}%"></i>
                              <i style="--segment-width:${maleWidth.toFixed(2)}%"></i>
                              <i style="--segment-width:${unmappedWidth.toFixed(2)}%"></i>
                            </span>
                          </span>
                          <span class="v2-contribution-value">${escapeHtml(amount)}</span>
                        </button>
                      `;
                    })
                    .join("")}
                </div>
              </article>

              <aside class="v2-panel v2-revenue-control-panel">
                ${v2LocalFilterStrip(role, field)}
              </aside>
            </div>
          </div>
        </div>
        ${v2MovementBoard(role, rows, context)}
        ${v2RevenuePerformanceTable(field)}
      </section>
    `;
  }

  function v2Spec(role, path, tab) {
    const label = v2TabLabel(v2RouteConfig(role, path), tab);
    const isQueue = /queue|billing|claims|blockers|documents|exceptions|discharge-flow|incidents|open-actions/i.test(tab);
    const isMatrix = /staffing|bed-capacity|capacity|utilization|machines|infection|patient-mix/i.test(tab);
    const isReports = path === "/reports";
    const isDrilldown = tab === "revenue-drilldown";
    const focusBranch = v2Branches.find((branch) => /high/i.test(branch.risk))?.name || v2Branches[0]?.name || "Branch";
    const metrics = [
      { label: "Network status", value: isQueue ? "12 open" : isMatrix ? "84%" : "On track", delta: appState.comparison },
      { label: "Primary signal", value: isQueue ? "4 high" : isMatrix ? "2 watch" : "+6.8%", delta: appState.timeframe },
      { label: "Branch focus", value: appState.branch === "All Network Branches" ? focusBranch : appState.branch, delta: "Selected view" },
      { label: "Risk", value: isQueue ? "Medium" : "Low", delta: "Role scoped" },
    ];
    return {
      label,
      isQueue,
      isMatrix,
      isReports,
      isDrilldown,
      metrics,
      summary:
        role === "COO"
          ? `${label} turns the overview signal into an operational workspace with owners, blockers, and next action.`
          : `${label} explains the executive signal with contribution, benchmark, and branch-level context.`,
    };
  }

  function v2RowsFor(role, path, tab) {
    if (path === "/revenue-cycle-ops" || /queue|billing|claims|documents|blockers/i.test(tab)) {
      return [
        ["RC-1042", "Central", "Insurance", "₹42L", "61-90", "Approval query", "Anika", "Watch"],
        ["RC-1037", "Riverside", "TPA", "₹38L", "90+", "Missing discharge summary", "Farah", "High"],
        ["RC-1028", "Northgate", "Corporate", "₹26L", "31-60", "Policy mismatch", "Dev", "Medium"],
        ["RC-1019", "Westside", "Cash", "₹11L", "0-30", "Patient payment", "Sara", "Low"],
      ];
    }
    if (path === "/operations") {
      return [
        ["OPD Clinics", "1,280", "22m wait", "Watch", "Maya", "Medium"],
        ["Ward A", "38 admits", "91% occupancy", "High pressure", "Ravi", "High"],
        ["ICU", "17 admits", "2 blocked", "Blocked beds", "Nisha", "High"],
        ["Procedure Unit", "42 cases", "7 delayed", "Equipment", "Kabir", "Medium"],
      ];
    }
    if (/quality/i.test(path)) {
      return [
        ["Riverside", "Infection cluster", "High", "3 cases", "Review isolation protocol", "High"],
        ["Central", "Readmission trend", "Medium", "0.4pp rise", "Audit discharge checklist", "Medium"],
        ["Westside", "ICU device alert", "Medium", "2 devices", "Pending check", "Medium"],
        ["Northgate", "Falls", "Low", "1 incident", "Reviewed", "Low"],
      ];
    }
    if (/dialysis/i.test(path)) {
      return [
        ["Westside", "Morning", "42 capacity", "39 used", "93%", "Low"],
        ["Eastview", "Afternoon", "38 capacity", "34 used", "89%", "Low"],
        ["Central", "Evening", "32 capacity", "24 used", "75%", "Medium"],
        ["Riverside", "Night", "28 capacity", "18 used", "64%", "High"],
      ];
    }
    return v2Branches.map((branch) => [
      branch.name,
      `₹${branch.revenue}Cr`,
      `${branch.margin}%`,
      `${branch.occupancy}%`,
      `${branch.alos}d`,
      branch.risk,
    ]);
  }

  function v2TableColumnWidths(headers) {
    if (headers.length >= 8) return [13, 13, 13, 11, 10, 21, 10, 9];
    if (headers.length === 7) return [16, 18, 13, 12, 12, 17, 12];
    if (headers.some((header) => /action/i.test(header))) return [26, 16, 14, 12, 14, 18];
    if (headers.length === 6) return [26, 16, 16, 16, 12, 14];
    return headers.map(() => 100 / headers.length);
  }

  function v2Table(headers, rows, drawerKind = "Detail", options = {}) {
    let statusIndex = headers.findIndex((header) => /^status$/i.test(header));
    if (statusIndex < 0) statusIndex = headers.findIndex((header) => /^risk$/i.test(header));
    if (statusIndex < 0) statusIndex = headers.findIndex((header) => /severity/i.test(header));
    const actionIndex = headers.findIndex((header) => /action/i.test(header));
    const widths = v2TableColumnWidths(headers);
    const table = `
      <div class="v2-table-wrap">
        <table class="v2-table" style="--v2-table-min:${headers.length >= 7 ? 900 : 760}px">
          <colgroup>
            ${headers.map((_, index) => `<col style="width:${(widths[index] || 100 / headers.length).toFixed(2)}%">`).join("")}
          </colgroup>
          <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
          <tbody>
            ${rows
              .map((row) => {
                const rowStatus = statusIndex >= 0 ? row[statusIndex] : row[row.length - 1];
                return `
                  <tr data-v2-drawer="${escapeHtml(row[0])}" data-v2-kind="${escapeHtml(drawerKind)}" data-v2-status="${escapeHtml(rowStatus)}">
                    ${row
                      .map((cell, index) => {
                        if (index === statusIndex) return `<td class="is-status">${v2Pill(cell)}</td>`;
                        if (index === actionIndex) return `<td class="is-action"><button type="button">${escapeHtml(cell)}</button></td>`;
                        return `<td>${escapeHtml(cell)}</td>`;
                      })
                      .join("")}
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    if (options.embedded) return table;

    return `
      <article class="v2-panel v2-table-panel">
        <div class="v2-panel-heading">
          <div><span>${escapeHtml(drawerKind)}</span><strong>Detailed records</strong></div>
        </div>
        ${table}
      </article>
    `;
  }

  function v2RankingBoard(spec, role, path, tab) {
    const rows = v2RowsFor(role, path, tab);
    const max = Math.max(...v2Branches.map((branch) => branch.revenue), 1);
    return `
      <div class="v2-board-grid">
        <article class="v2-panel">
          <div class="v2-panel-heading">
            <div><span>${escapeHtml(spec.label)}</span><strong>${escapeHtml(spec.summary)}</strong></div>
          </div>
          <div class="v2-rank-list">
            ${v2Branches
              .map(
                (branch) => `
                  <button type="button" class="v2-rank-row" data-v2-drawer="${escapeHtml(branch.name)}" data-v2-kind="${escapeHtml(spec.label)}" data-v2-status="${escapeHtml(branch.risk)}">
                    <span><strong>${escapeHtml(branch.name)}</strong><em>${escapeHtml(branch.risk)} risk · ${branch.occupancy}% occupancy</em></span>
                    <i><b style="width:${Math.max(14, (branch.revenue / max) * 100).toFixed(2)}%"></b></i>
                    <strong>${escapeHtml(path === "/operations" ? `${branch.opd}` : `₹${branch.revenue}Cr`)}</strong>
                  </button>
                `,
              )
              .join("")}
          </div>
        </article>
        <aside class="v2-panel v2-side-panel">
          <div class="v2-panel-heading"><div><span>Selected context</span><strong>${escapeHtml(appState.branch)}</strong></div></div>
          <div class="v2-insight-card"><span>Recommended next action</span><strong>Review Central and Riverside</strong><p>Both branches carry the strongest pressure in this view.</p></div>
          <div class="v2-insight-card"><span>Related drilldown</span><strong>${role === "COO" ? "Operations queue" : "Branch detail"}</strong><p>Row click opens the focused drawer without leaving the page.</p></div>
        </aside>
      </div>
      ${v2Table(["Branch", "Revenue", "Margin", "Occupancy", "ALOS", "Risk"], rows, spec.label)}
    `;
  }

  function v2MatrixBoard(spec, role, path, tab) {
    return `
      <div class="v2-board-grid">
        <article class="v2-panel">
          <div class="v2-panel-heading"><div><span>${escapeHtml(spec.label)}</span><strong>${escapeHtml(spec.summary)}</strong></div></div>
          <div class="v2-matrix" style="--matrix-columns:${v2Shifts.length}">
            <span></span>${v2Shifts.map((shift) => `<strong>${escapeHtml(shift)}</strong>`).join("")}
            ${v2Units
              .map((unit, unitIndex) =>
                [
                  `<strong>${escapeHtml(unit)}</strong>`,
                  ...v2Shifts.map((shift, shiftIndex) => {
                    const value = 72 + ((unitIndex * 9 + shiftIndex * 7) % 28);
                    const status = value > 91 ? "High" : value > 82 ? "Watch" : "Healthy";
                    return `<button type="button" class="v2-matrix-cell v2-matrix-cell--${v2StatusTone(status)}" data-v2-drawer="${escapeHtml(unit)} · ${escapeHtml(shift)}" data-v2-kind="${escapeHtml(spec.label)}" data-v2-status="${escapeHtml(status)}"><span>${value}%</span><em>${status}</em></button>`;
                  }),
                ].join(""),
              )
              .join("")}
          </div>
        </article>
        <aside class="v2-panel v2-side-panel">
          <div class="v2-insight-card"><span>Pressure point</span><strong>Evening coverage</strong><p>Central and Riverside show the largest gap against required coverage.</p></div>
          <div class="v2-insight-card"><span>Allowed detail</span><strong>${role === "COO" ? "Unit and shift" : "Branch summary"}</strong><p>RBAC keeps patient-level details out of this prototype.</p></div>
        </aside>
      </div>
      ${v2Table(["Unit / Branch", "Shift", "Capacity", "Used", "Utilization", "Status"], v2RowsFor(role, path, tab), spec.label)}
    `;
  }

  function v2QueueBoard(spec, role, path, tab) {
    const rows = v2RowsFor(role, path, tab);
    return `
      <div class="v2-board-grid v2-board-grid--queue">
        <article class="v2-panel">
          <div class="v2-panel-heading"><div><span>${escapeHtml(spec.label)}</span><strong>${escapeHtml(spec.summary)}</strong></div></div>
          ${v2Table(["Case / Unit", "Branch", "Payer", "Amount", "Aging", "Blocker", "Owner", "Status"], rows, spec.label, { embedded: true })}
        </article>
        <aside class="v2-panel v2-side-panel">
          <div class="v2-panel-heading"><div><span>Selected case detail</span><strong>Ready on row click</strong></div></div>
          <div class="v2-insight-card"><span>Main blockers</span><strong>Approvals and missing documents</strong><p>Use row click to open a case drawer with next action and owner context.</p></div>
          <div class="v2-action-stack"><button type="button" data-v2-drawer="Owner queue" data-v2-kind="Owner" data-v2-status="Watch">Open owner queue</button><button type="button" data-v2-drawer="Similar blockers" data-v2-kind="Blocker" data-v2-status="Medium">Filter similar blockers</button></div>
        </aside>
      </div>
    `;
  }

  function v2DriverBoard(title, summary, rows, options = {}) {
    const max = Math.max(...rows.map((row) => row.value), 1);
    return `
      <article class="v2-panel">
        <div class="v2-panel-heading">
          <div><span>${escapeHtml(title)}</span><strong>${escapeHtml(summary)}</strong></div>
          ${options.legend ? `<div class="v2-mini-legend">${options.legend}</div>` : ""}
        </div>
        <div class="v2-driver-list">
          ${rows
            .map((row) => `
              <button type="button" class="v2-driver-row" data-v2-drawer="${escapeHtml(row.name)}" data-v2-kind="${escapeHtml(title)}" data-v2-status="${escapeHtml(row.status || "Open")}">
                <span><strong>${escapeHtml(row.name)}</strong><em>${escapeHtml(row.note || "")}</em></span>
                <i style="--driver-width:${Math.max(7, (row.value / max) * 100).toFixed(2)}%"><b></b>${row.target ? `<u style="left:${Math.min(98, (row.target / max) * 100).toFixed(2)}%"></u>` : ""}</i>
                <strong>${escapeHtml(row.display || String(row.value))}</strong>
              </button>
            `)
            .join("")}
        </div>
      </article>
    `;
  }

  function v2MarginBoard(rows) {
    const target = 22;
    const min = 16;
    const max = 26;
    const targetPct = ((target - min) / (max - min)) * 100;
    const toPct = (value) => Math.max(4, Math.min(100, ((value - min) / (max - min)) * 100));
    return `
      <article class="v2-panel v2-margin-panel">
        <div class="v2-panel-heading">
          <div>
            <span>EBITDA Margin vs Target</span>
            <strong>Fixed scale bullet chart, target ${target}%.</strong>
          </div>
          <div class="v2-mini-legend">
            <span><i style="--legend-color:var(--color-primary)"></i> Current margin</span>
            <span><i style="--legend-color:var(--color-chart-4)"></i> Target</span>
          </div>
        </div>
        <div class="v2-margin-axis" style="--target-left:${targetPct.toFixed(2)}%">
          <span>${min}%</span>
          <span>Target ${target}%</span>
          <span>${max}%</span>
        </div>
        <div class="v2-margin-list">
          ${rows
            .map((row) => {
              const gap = row.value - target;
              const tone = gap >= 0 ? "good" : gap > -2 ? "watch" : "bad";
              return `
                <button type="button" class="v2-margin-row" data-v2-drawer="${escapeHtml(row.name)}" data-v2-kind="EBITDA margin" data-v2-status="${escapeHtml(row.status || "Open")}">
                  <span>
                    <strong>${escapeHtml(row.name)}</strong>
                    <em>${escapeHtml(row.note || "")}</em>
                  </span>
                  <i class="v2-margin-track" style="--margin-width:${toPct(row.value).toFixed(2)}%; --target-left:${targetPct.toFixed(2)}%">
                    <b data-tone="${tone}"></b>
                    <u></u>
                  </i>
                  <strong>${escapeHtml(row.display || `${row.value}%`)}</strong>
                  <em data-tone="${tone}">${gap >= 0 ? "+" : ""}${gap.toFixed(1)}pp</em>
                </button>
              `;
            })
            .join("")}
        </div>
      </article>
    `;
  }

  function v2ArpobEbitdaBoard(rows) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const arpobSeries = [41.2, 39.4, 38.1, 36.6, 37.8, 40.1, 42.4, 41.8, 39.9, 38.7, 40.8, 43.2];
    const marginSeries = [24.6, 23.8, 22.9, 22.1, 21.4, 21.9, 22.8, 23.5, 22.7, 21.8, 22.4, 24.1];
    const chartRows = months.map((month, index) => {
      return { month, arpob: arpobSeries[index], margin: marginSeries[index] };
    });
    const maxArpob = 45;
    const minMargin = 18;
    const maxMargin = 26;
    const xFor = (index) => 88 + index * 88;
    const barBase = 300;
    const chartTop = 34;
    const chartHeight = 266;
    const barTop = (value) => barBase - (value / maxArpob) * chartHeight;
    const yForMargin = (value) => barBase - ((value - minMargin) / (maxMargin - minMargin)) * chartHeight;
    const roundedTopBar = (x, y, width, height, radius = 8) => {
      const left = x - width / 2;
      const right = x + width / 2;
      const bottom = y + height;
      return `M${left},${bottom}V${y + radius}Q${left},${y} ${left + radius},${y}H${right - radius}Q${right},${y} ${right},${y + radius}V${bottom}Z`;
    };
    const points = chartRows.map((row, index) => `${xFor(index)},${yForMargin(row.margin).toFixed(1)}`).join(" ");
    return `
      <article class="v2-panel v2-quality-panel">
        <div class="v2-panel-heading">
          <div>
            <span>ARPOB vs EBITDA Margin</span>
            <strong>12-month ARPOB (₹k) bars with EBITDA margin trend.</strong>
          </div>
          <div class="v2-mini-legend">
            <span><i style="--legend-color:var(--color-primary)"></i> ARPOB (₹k)</span>
            <span><i style="--legend-color:#f97316"></i> EBITDA margin</span>
          </div>
        </div>
        <div class="v2-combo-chart" role="img" aria-label="ARPOB bars and EBITDA margin line by month">
          <svg viewBox="0 0 1180 340" preserveAspectRatio="xMidYMid meet">
            <g class="v2-combo-grid">
              <line x1="56" x2="1088" y1="${chartTop}" y2="${chartTop}"></line>
              <line x1="56" x2="1088" y1="101" y2="101"></line>
              <line x1="56" x2="1088" y1="167" y2="167"></line>
              <line x1="56" x2="1088" y1="234" y2="234"></line>
              <line x1="56" x2="1088" y1="${barBase}" y2="${barBase}"></line>
            </g>
            <g class="v2-combo-bars">
              ${chartRows
                .map((row, index) => {
                  const x = xFor(index);
                  const y = barTop(row.arpob);
                  const height = barBase - y;
                  return `
                    <path d="${roundedTopBar(x, Number(y.toFixed(1)), 42, Number(height.toFixed(1)))}"></path>
                    <text x="${x}" y="326" text-anchor="middle">${escapeHtml(row.month)}</text>
                  `;
                })
                .join("")}
            </g>
            <polyline class="v2-combo-line" points="${points}"></polyline>
            <g class="v2-combo-points">
              ${chartRows
                .map((row, index) => {
                  const x = xFor(index);
                  const y = yForMargin(row.margin);
                  return `
                    <circle cx="${x}" cy="${y.toFixed(1)}" r="5"></circle>
                  `;
                })
                .join("")}
            </g>
            <g class="v2-combo-axis">
              <text class="v2-combo-axis-name" x="4" y="167" text-anchor="middle" transform="rotate(-90 4 167)">ARPOB (₹k)</text>
              <text x="32" y="${chartTop + 4}" text-anchor="end">45</text>
              <text x="32" y="105" text-anchor="end">34</text>
              <text x="32" y="171" text-anchor="end">23</text>
              <text x="32" y="238" text-anchor="end">11</text>
              <text x="32" y="${barBase + 4}" text-anchor="end">0</text>
              <text class="v2-combo-axis-name" x="1162" y="167" text-anchor="middle" transform="rotate(90 1162 167)">EBITDA margin</text>
              <text x="1120" y="${yForMargin(26) + 4}" text-anchor="start">26%</text>
              <text x="1120" y="${yForMargin(24) + 4}" text-anchor="start">24%</text>
              <text x="1120" y="${yForMargin(22) + 4}" text-anchor="start">22%</text>
              <text x="1120" y="${yForMargin(20) + 4}" text-anchor="start">20%</text>
              <text x="1120" y="${yForMargin(18) + 4}" text-anchor="start">18%</text>
            </g>
          </svg>
          <div class="v2-combo-hovers" aria-hidden="true">
            ${chartRows
              .map(
                (row, index) => `
                  <span class="v2-combo-hit" style="--combo-hit-left:${((index + 0.5) / chartRows.length) * 100}%">
                    <span class="v2-combo-tooltip">
                      <strong>${escapeHtml(row.month)}</strong>
                      <em><b></b>ARPOB <i>₹${row.arpob.toFixed(1)}k</i></em>
                      <em><b></b>EBITDA margin <i>${row.margin.toFixed(1)}%</i></em>
                    </span>
                  </span>
                `,
              )
              .join("")}
          </div>
        </div>
      </article>
    `;
  }

  function v2CompactMetricRail(cards) {
    return `
      <aside class="v2-panel v2-side-panel">
        ${cards
          .map(
            (card) => `
              <div class="v2-insight-card">
                <span>${escapeHtml(card.label)}</span>
                <strong>${escapeHtml(card.value)}</strong>
                <p>${escapeHtml(card.note || "")}</p>
              </div>
            `,
          )
          .join("")}
      </aside>
    `;
  }

  function v2BucketBoard(title, buckets, rows) {
    return `
      <article class="v2-panel">
        <div class="v2-panel-heading">
          <div><span>${escapeHtml(title)}</span></div>
        </div>
        <div class="v2-bucket-grid" style="--bucket-columns:${buckets.length}">
          <span></span>${buckets.map((bucket) => `<strong>${escapeHtml(bucket)}</strong>`).join("")}
          ${rows
            .map((row) =>
              [
                `<b>${escapeHtml(row.name)}</b>`,
                ...row.values.map((value, index) => {
                  const status = index >= 3 && value > 10 ? "High" : index >= 2 ? "Watch" : "Low";
                  return `<button type="button" class="v2-bucket-cell v2-bucket-cell--age-${index} v2-bucket-cell--${v2StatusTone(status)}" data-v2-drawer="${escapeHtml(row.name)} · ${escapeHtml(buckets[index])}" data-v2-kind="${escapeHtml(title)}" data-v2-status="${status}"><span>₹${value}L</span></button>`;
                }),
              ].join(""),
            )
            .join("")}
        </div>
      </article>
    `;
  }

  function v2FunnelBoard(title, summary, steps) {
    const max = Math.max(...steps.map((step) => step.value), 1);
    return `
      <article class="v2-panel">
        <div class="v2-panel-heading"><div><span>${escapeHtml(title)}</span><strong>${escapeHtml(summary)}</strong></div></div>
        <div class="v2-funnel">
          ${steps
            .map((step, index) => `
              <button type="button" class="v2-funnel-step" data-v2-drawer="${escapeHtml(step.name)}" data-v2-kind="${escapeHtml(title)}" data-v2-status="${escapeHtml(step.status || "Open")}">
                <span>${escapeHtml(step.name)}</span>
                <i style="--funnel-width:${Math.max(18, (step.value / max) * 100).toFixed(2)}%"></i>
                <strong>${escapeHtml(step.display)}</strong>
                ${index < steps.length - 1 ? "<em></em>" : ""}
              </button>
            `)
            .join("")}
        </div>
      </article>
    `;
  }

  function v2TileGrid(title, summary, tiles) {
    return `
      <article class="v2-panel">
        <div class="v2-panel-heading"><div><span>${escapeHtml(title)}</span><strong>${escapeHtml(summary)}</strong></div></div>
        <div class="v2-tile-grid">
          ${tiles
            .map(
              (tile) => `
                <button type="button" class="v2-analysis-tile" data-v2-drawer="${escapeHtml(tile.title)}" data-v2-kind="${escapeHtml(title)}" data-v2-status="${escapeHtml(tile.status || "Open")}">
                  <span>${escapeHtml(tile.label)}</span>
                  <strong>${escapeHtml(tile.title)}</strong>
                  <em>${escapeHtml(tile.value)}</em>
                  <p>${escapeHtml(tile.note)}</p>
                </button>
              `,
            )
            .join("")}
        </div>
      </article>
    `;
  }

  function v2LaneBoard(title, summary, lanes) {
    const max = Math.max(...lanes.map((lane) => lane.value), 1);
    return `
      <article class="v2-panel">
        <div class="v2-panel-heading"><div><span>${escapeHtml(title)}</span><strong>${escapeHtml(summary)}</strong></div></div>
        <div class="v2-lane-board">
          ${lanes
            .map(
              (lane) => `
                <button type="button" class="v2-lane" data-v2-drawer="${escapeHtml(lane.name)}" data-v2-kind="${escapeHtml(title)}" data-v2-status="${escapeHtml(lane.status || "Open")}">
                  <span><strong>${escapeHtml(lane.name)}</strong><em>${escapeHtml(lane.note)}</em></span>
                  <i style="--lane-width:${Math.max(8, (lane.value / max) * 100).toFixed(2)}%"></i>
                  ${v2Pill(lane.status || "Low")}
                </button>
              `,
            )
            .join("")}
        </div>
      </article>
    `;
  }

  function v2PressureBoard(title, summary, rows, options = {}) {
    const max = options.max || Math.max(...rows.map((row) => row.value), 1);
    const target = options.target || max * 0.82;
    const unit = options.unit || "%";
    return `
      <article class="v2-panel v2-pressure-panel">
        <div class="v2-panel-heading">
          <div><span>${escapeHtml(title)}</span><strong>${escapeHtml(summary)}</strong></div>
          <div class="v2-pressure-legend">
            <span>Healthy</span><span>Watch</span><span>Pressure</span>
          </div>
        </div>
        <div class="v2-pressure-list">
          ${rows
            .map((row) => {
              const valuePct = Math.max(3, Math.min(100, (row.value / max) * 100));
              const targetPct = Math.max(3, Math.min(99, (target / max) * 100));
              return `
                <button type="button" class="v2-pressure-row" data-v2-drawer="${escapeHtml(row.name)}" data-v2-kind="${escapeHtml(title)}" data-v2-status="${escapeHtml(row.status || "Open")}">
                  <span>
                    <strong>${escapeHtml(row.name)}</strong>
                    <em>${escapeHtml(row.note || "")}</em>
                  </span>
                  <i class="v2-pressure-track" style="--pressure-value:${valuePct.toFixed(2)}%; --pressure-target:${targetPct.toFixed(2)}%">
                    <b></b><u></u>
                  </i>
                  <strong>${escapeHtml(row.display || `${row.value}${unit}`)}</strong>
                </button>
              `;
            })
            .join("")}
        </div>
      </article>
    `;
  }

  function v2BranchDecisionBoard(title, summary, rows) {
    return `
      <article class="v2-panel v2-decision-panel">
        <div class="v2-panel-heading">
          <div><span>${escapeHtml(title)}</span><strong>${escapeHtml(summary)}</strong></div>
        </div>
        <div class="v2-decision-grid">
          ${rows
            .map(
              (row) => `
                <button type="button" class="v2-decision-card" data-v2-drawer="${escapeHtml(row.branch)}" data-v2-kind="${escapeHtml(title)}" data-v2-status="${escapeHtml(row.status)}">
                  <span>${escapeHtml(row.branch)}</span>
                  <strong>${escapeHtml(row.primary)}</strong>
                  <p>${escapeHtml(row.detail)}</p>
                  ${v2Pill(row.status)}
                </button>
              `,
            )
            .join("")}
        </div>
      </article>
    `;
  }

  function v2ShiftGridBoard(title, summary, rows) {
    return `
      <article class="v2-panel v2-shift-panel">
        <div class="v2-panel-heading"><div><span>${escapeHtml(title)}</span><strong>${escapeHtml(summary)}</strong></div></div>
        <div class="v2-shift-grid">
          <span></span>
          ${v2Shifts.map((shift) => `<strong>${escapeHtml(shift)}</strong>`).join("")}
          ${rows
            .map((row) =>
              [
                `<b>${escapeHtml(row.branch)}</b>`,
                ...row.values.map((value, index) => {
                  const status = value < 70 ? "High" : value < 82 ? "Watch" : "Low";
                  return `<button type="button" class="v2-shift-cell v2-shift-cell--${v2StatusTone(status)}" data-v2-drawer="${escapeHtml(row.branch)} · ${escapeHtml(v2Shifts[index])}" data-v2-kind="${escapeHtml(title)}" data-v2-status="${status}"><span>${value}%</span><em>${status === "Low" ? "Covered" : status}</em></button>`;
                }),
              ].join(""),
            )
            .join("")}
        </div>
      </article>
    `;
  }

  function v2WorkflowTable(title, summary, columns, rows) {
    return `
      <article class="v2-panel v2-workflow-panel">
        <div class="v2-panel-heading">
          <div><span>${escapeHtml(title)}</span><strong>${escapeHtml(summary)}</strong></div>
        </div>
        <div class="v2-workflow-table" style="--workflow-columns:${columns.length}">
          ${columns.map((column) => `<b>${escapeHtml(column)}</b>`).join("")}
          ${rows
            .map((row) =>
              row
                .map((cell, index) => {
                  const value = typeof cell === "object" ? cell.value : cell;
                  const note = typeof cell === "object" ? cell.note : "";
                  const status = typeof cell === "object" ? cell.status : "";
                  const drawer = typeof cell === "object" ? cell.drawer || value : value;
                  return `
                    <button type="button" class="v2-workflow-cell ${index === 0 ? "is-primary" : ""} ${status ? `v2-workflow-cell--${v2StatusTone(status)}` : ""}" data-v2-drawer="${escapeHtml(drawer)}" data-v2-kind="${escapeHtml(title)}" data-v2-status="${escapeHtml(status || "Open")}">
                      <strong>${escapeHtml(value)}</strong>
                      ${note ? `<em>${escapeHtml(note)}</em>` : ""}
                    </button>
                  `;
                })
                .join(""),
            )
            .join("")}
        </div>
      </article>
    `;
  }

  const ceoVolumeRows = zyephrDerived?.ceoVolumeRows || [
    { branch: "Westside", op: 1640, ip: 328, growth: 9.1, revenue: 23, status: "Low" },
    { branch: "Eastview", op: 1480, ip: 296, growth: 7.4, revenue: 20, status: "Low" },
    { branch: "Northgate", op: 1320, ip: 244, growth: 6.2, revenue: 18, status: "Medium" },
    { branch: "Southpoint", op: 1180, ip: 218, growth: 4.9, revenue: 14, status: "Low" },
    { branch: "Central", op: 960, ip: 188, growth: 1.8, revenue: 13, status: "High" },
    { branch: "Riverside", op: 880, ip: 168, growth: -1.2, revenue: 12, status: "High" },
  ];

  function ceoChartKey(label, index) {
    return (
      String(label || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "") || `series_${index}`
    );
  }

  function ceoChartColor(tone, index) {
    if (tone === "previous") return "#6f98bd";
    if (tone === "target") return "#d6a94a";
    if (tone === "warn") return "#d89100";
    return index === 1 ? "#4f7fa8" : "#18a9b8";
  }

  const ceoBranchPalette = ["#32b7c8", "#ff765e", "#e77aae", "#f4b451", "#2fbf7f", "#6f98bd"];
  const ceoBranchColorMap = {
    Whitefield: "#32b7c8",
    Jayanagar: "#ff765e",
    Hebbal: "#e77aae",
    "Electronic City": "#f4b451",
  };

  function ceoBranchColor(name, index = 0) {
    if (ceoBranchColorMap[name]) return ceoBranchColorMap[name];
    const branchIndex = zyephrBranchNames.indexOf(name);
    return ceoBranchPalette[(branchIndex >= 0 ? branchIndex : index) % ceoBranchPalette.length];
  }

  function ceoTooltipValue(value, unit = "") {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "—";
    if (unit === "%") return `${numeric.toFixed(1)}%`;
    if (unit === "₹Cr") return `₹${numeric.toFixed(2)}Cr`;
    if (unit === "m") return `${numeric.toFixed(1)} min`;
    if (unit === "d") return `${numeric.toFixed(2)}d`;
    if (Math.abs(numeric) >= 1000) return Math.round(numeric).toLocaleString("en-IN");
    return numeric.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }

  function ceoTooltipMetricLabel(title, fallback = "Value") {
    const label = String(title || fallback)
      .replace(/\s+by branch$/i, "")
      .replace(/^branch\s+/i, "")
      .trim();
    return label ? label.charAt(0).toUpperCase() + label.slice(1) : fallback;
  }

  function ceoTooltipRowsAttribute(rows) {
    return escapeHtml(JSON.stringify(rows.filter(Boolean)));
  }

  function ceoTooltipAttrs(title, rows) {
    return `data-ceo-tooltip-title="${escapeHtml(title)}" data-ceo-tooltip-rows="${ceoTooltipRowsAttribute(rows)}"`;
  }

  function ensureCeoChartTooltip(card) {
    let tooltip = card.querySelector(":scope > .ceo-chart-tooltip");
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.className = "ceo-chart-tooltip";
      tooltip.hidden = true;
      card.appendChild(tooltip);
    }
    return tooltip;
  }

  function renderCeoChartTooltip(tooltip, title, rows) {
    tooltip.innerHTML = `
      <strong>${escapeHtml(title || "")}</strong>
      ${rows
        .map(
          (row) => `
            <span>
              <i style="--tooltip-color:${escapeHtml(row.color || "var(--color-primary)")};"></i>
              <em>${escapeHtml(row.label || "")}</em>
              <b>${escapeHtml(row.display ?? row.value ?? "—")}</b>
            </span>
          `,
        )
        .join("")}
    `;
  }

  function positionCeoChartTooltip(card, tooltip, event) {
    const cardRect = card.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const halfWidth = Math.min(132, Math.max(96, cardRect.width / 2 - 12));
    const rawLeft = event.clientX - cardRect.left;
    const left = Math.max(halfWidth, Math.min(Math.max(halfWidth, cardRect.width - halfWidth), rawLeft));
    const localY = event.clientY - cardRect.top;
    const topGap = localY - tooltipRect.height - 16;
    const canPlaceAbove = topGap >= 64;
    const top = canPlaceAbove
      ? Math.max(72, localY - 14)
      : Math.min(Math.max(72, cardRect.height - tooltipRect.height - 12), localY + 14);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.transform = canPlaceAbove ? "translate(-50%, -100%)" : "translateX(-50%)";
  }

  function showCeoChartTooltip(card, tooltip, event, title, rows) {
    if (!rows?.length) return;
    document.querySelectorAll(".ceo-chart-tooltip").forEach((node) => {
      if (node !== tooltip) node.hidden = true;
    });
    renderCeoChartTooltip(tooltip, title, rows);
    tooltip.hidden = false;
    positionCeoChartTooltip(card, tooltip, event);
  }

  function parseCeoTooltipRows(target) {
    try {
      const rows = JSON.parse(target?.getAttribute("data-ceo-tooltip-rows") || "[]");
      return Array.isArray(rows) ? rows : [];
    } catch {
      return [];
    }
  }

  function ceoBranchDonutSegmentForEvent(donut, event) {
    let segments = [];
    try {
      segments = JSON.parse(donut?.getAttribute("data-ceo-branch-donut-segments") || "[]");
    } catch {
      segments = [];
    }
    if (!segments.length) return null;

    const rect = donut.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const innerRadius = Math.max(0, rect.width / 2 - 26);
    if (distance < innerRadius) return null;
    const percent = (((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360) / 360 * 100;
    return segments.find((segment) => percent >= segment.start && percent < segment.end) || segments[segments.length - 1];
  }

  function ceoChartConfig(type, props) {
    return escapeHtml(JSON.stringify({ type, props }));
  }

  function ceoSelectedRange(title) {
    return ceoOverviewChartRanges[ceoChartKey(title, 0)] || rangeForTimeframe(appState.timeframe) || defaultRange;
  }

  function ceoRangeLabels(range, baseLabels) {
    if (range === "Daily") return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    if (range === "Weekly") return ["W1", "W2", "W3", "W4", "W5", "W6"];
    if (range === "Yearly") {
      const year = Number(zyephrDerived?.year || new Date().getFullYear());
      return Array.from({ length: 6 }, (_, index) => String(year - 5 + index));
    }
    return baseLabels;
  }

  function ceoDailyValues(values) {
    const last = Number(values.at(-1) || 0);
    const previous = Number(values.at(-2) || last);
    const movement = (last - previous) / 6;
    const pulse = [-0.03, 0.015, -0.01, 0.025, -0.005, 0.018, 0];
    return Array.from({ length: 7 }, (_, index) => Math.max(0, previous + movement * index + last * pulse[index]));
  }

  function ceoRevenueRangeValues(item, index, range) {
    const values = item.values || [];
    const last = Number(values.at(-1) || 0);
    const previous = Number(values.at(-2) || last);
    if (range === "Daily") {
      const dailyBase = Math.max(1, (last + previous) / 14);
      if (item.tone === "target") return [1.02, 1.02, 1.02, 1.02, 1.02, 1.02, 1.02].map((factor) => dailyBase * factor);
      const patterns = [
        [0.88, 1.02, 0.95, 1.16, 0.98, 1.22, 1.06],
        [1.04, 0.9, 1.08, 0.96, 0.92, 1.06, 0.98],
      ];
      return patterns[index % patterns.length].map((factor) => dailyBase * factor);
    }
    if (range === "Weekly") {
      const weeklyBase = Math.max(1, last / 4.3);
      if (item.tone === "target") return [0.98, 1, 1.01, 1.02, 1.03, 1.03].map((factor) => weeklyBase * factor);
      const patterns = [
        [0.86, 1.08, 0.98, 1.16, 1.03, 1.24],
        [0.94, 0.9, 1.04, 0.97, 1.1, 1.02],
      ];
      return patterns[index % patterns.length].map((factor) => weeklyBase * factor);
    }
    if (range === "Monthly") {
      const monthlyBase = Math.max(1, last || previous);
      if (item.tone === "target") return [0.9, 0.92, 0.94, 0.96, 0.98, 1, 1.02, 1.03, 1.04, 1.05, 1.06, 1.07].map((factor) => monthlyBase * factor);
      const patterns = [
        [0.76, 0.9, 0.86, 1.02, 0.94, 1.08, 1.0, 1.18, 1.1, 1.24, 1.16, 1.3],
        [0.68, 0.78, 0.74, 0.86, 0.82, 0.94, 0.9, 1.02, 0.98, 1.08, 1.04, 1.14],
      ];
      return patterns[index % patterns.length].map((factor) => monthlyBase * factor);
    }
    if (range === "Yearly") {
      const yearlyBase = Math.max(1, last || previous);
      if (item.tone === "target") return [0.58, 0.66, 0.74, 0.84, 0.94, 1.05].map((factor) => yearlyBase * factor);
      const patterns = [
        [0.48, 0.57, 0.71, 0.82, 0.96, 1.18],
        [0.43, 0.52, 0.62, 0.74, 0.86, 0.98],
      ];
      return patterns[index % patterns.length].map((factor) => yearlyBase * factor);
    }
    return ceoRangeValues(values, range);
  }

  function ceoWeeklyValues(values) {
    const source = values.length >= 6 ? values.slice(-6) : Array.from({ length: 6 }, (_, index) => values[index % Math.max(values.length, 1)] || 0);
    return source.map(Number);
  }

  function ceoYearlyValues(values) {
    const last = Number(values.at(-1) || 0);
    const average = values.reduce((sum, value) => sum + Number(value || 0), 0) / Math.max(values.length, 1);
    return [0.82, 0.88, 0.94, 1, 1.06, 1.1].map((factor, index) => Math.max(0, (index === 5 ? last : average) * factor));
  }

  function ceoRangeValues(values, range) {
    if (range === "Daily") return ceoDailyValues(values);
    if (range === "Weekly") return ceoWeeklyValues(values);
    if (range === "Yearly") return ceoYearlyValues(values);
    return values;
  }

  function ceoRangeData(title, labels, series) {
    const range = ceoSelectedRange(title);
    const isRevenueTrend = /revenue trend/i.test(title || "");
    return {
      range,
      labels: ceoRangeLabels(range, labels),
      series: series.map((item, index) => ({
        ...item,
        values: isRevenueTrend ? ceoRevenueRangeValues(item, index, range) : ceoRangeValues(item.values || [], range),
      })),
    };
  }

  function ceoRangePicker(title) {
    const selected = ceoSelectedRange(title);
    return `
      <div class="ceo-scan-range" role="group" aria-label="Chart range">
        ${["Daily", "Weekly", "Monthly", "Yearly"]
          .map((range) => `<button type="button" class="${range === selected ? "is-active" : ""}" data-ceo-range="${range}" aria-pressed="${String(range === selected)}">${range}</button>`)
          .join("")}
      </div>
    `;
  }

  function ceoChartLegend(series) {
    return `
      <div class="ceo-scan-legend" aria-label="Chart legend">
        ${series
          .map((item) => `<span><i class="ceo-scan-legend-dot ceo-scan-legend-dot--${escapeHtml(item.tone)}" ${item.color ? `style="background:${escapeHtml(item.color)};"` : ""}></i>${escapeHtml(item.label)}</span>`)
          .join("")}
      </div>
    `;
  }

  let ceoRechartsModulePromise = null;

  function normalizeCeoTrendGradient(host) {
    if (!host?.classList?.contains("ceo-recharts-host--trend")) return;
    const apply = () => {
      host.querySelectorAll("linearGradient").forEach((gradient) => {
        gradient.setAttribute("x1", "0");
        gradient.setAttribute("x2", "0");
        gradient.setAttribute("y1", "0");
        gradient.setAttribute("y2", "1");
      });
    };

    apply();
    window.requestAnimationFrame(() => window.requestAnimationFrame(apply));
  }

  async function mountCeoRecharts(scope = document) {
    const selector = "[data-ceo-recharts]:not([data-ceo-recharts-mounted])";
    const hosts = [
      ...(scope.matches?.(selector) ? [scope] : []),
      ...Array.from(scope.querySelectorAll?.(selector) || []),
    ];
    if (!hosts.length) return;

    const React = window.__zyephrReact;
    const ReactDOM = window.__zyephrReactDomClient;
    if (!React || (!ReactDOM?.createRoot && !ReactDOM?.hydrateRoot)) {
      window.setTimeout(mountCeoRecharts, 80);
      return;
    }

    ceoRechartsModulePromise ||= import("/assets/charts-CdF5KnuP.js");
    const charts = await ceoRechartsModulePromise;

    hosts.forEach((host) => {
      let config;
      try {
        config = JSON.parse(host.getAttribute("data-ceo-recharts") || "{}");
      } catch (error) {
        return;
      }

      const Component = config.type === "bar" ? charts.n : config.type === "donut" ? charts.t : config.type === "capacity" ? charts.c : config.type === "bullet" ? charts.d : config.type === "bedStack" ? charts.e : charts.i;
      if (!Component) return;

      if (config.type === "bar" && config.props?.colorBy === "branch") {
        config.props.colorBy = (row) => row.color || ceoBranchColor(row.name);
      }

      host.setAttribute("data-ceo-recharts-mounted", "true");
      const element = React.createElement(Component, config.props || {});
      if (ReactDOM.createRoot) {
        ReactDOM.createRoot(host).render(element);
      } else {
        ReactDOM.hydrateRoot(host, element, { onRecoverableError: () => {} });
      }
      normalizeCeoTrendGradient(host);
      attachCeoChartTooltip(host, config.props || {});
    });
  }

  function attachCeoChartTooltip(host, props) {
    const card = host.closest(".ceo-scan-card");
    if (!card || host.dataset.ceoTooltipBound === "true") return;
    const data = Array.isArray(props?.data) ? props.data : [];
    if (!data.length) return;

    host.dataset.ceoTooltipBound = "true";
    const tooltip = ensureCeoChartTooltip(card);
    const isTrend = host.classList.contains("ceo-recharts-host--trend");
    const isCapacity = host.classList.contains("ceo-recharts-host--capacity");
    const isDialysisBullet = host.classList.contains("ceo-recharts-host--dialysis-bullet");
    const isBedStack = host.classList.contains("coo-recharts-host--beds");
    const barShapes = () => Array.from(host.querySelectorAll("path.recharts-rectangle"));

    const setActiveBar = (index) => {
      const bars = barShapes();
      if (!bars.length || index < 0) return;
      host.classList.add("is-bar-focus");
      bars.forEach((bar, barIndex) => {
        const isActive = barIndex % data.length === index;
        bar.classList.toggle("is-active-bar", isActive);
        bar.classList.toggle("is-muted-bar", !isActive);
      });
    };

    const clearActiveBar = () => {
      host.classList.remove("is-bar-focus");
      barShapes().forEach((bar) => {
        bar.classList.remove("is-active-bar", "is-muted-bar");
      });
    };

    const fallbackRows = (point) => {
      if (isBedStack) {
        return [
          { label: "Occupied", display: `${Number(point?.occupied || 0).toFixed(1)}%`, color: "var(--color-primary)" },
          { label: "Cleaning", display: `${Number(point?.cleaning || 0).toFixed(1)}%`, color: "#f5b544" },
          { label: "Available", display: `${Number(point?.available || 0).toFixed(1)}%`, color: "color-mix(in srgb, var(--color-muted-foreground) 18%, var(--color-surface))" },
          { label: "Blocked", display: `${Number(point?.blocked || 0).toFixed(1)}%`, color: "var(--color-destructive)" },
        ];
      }
      return [
        {
          label: props?.valueLabel || "Value",
          value: point?.value,
          display: ceoTooltipValue(point?.value, props?.unit || ""),
          color: point?.color || "var(--color-primary)",
        },
      ];
    };

    const pointRows = (point) => {
      const rows = Array.isArray(point?.__tooltipRows) ? point.__tooltipRows : fallbackRows(point);
      return rows.filter(Boolean);
    };

    const shapePoint = (event) => {
      const shape = event.target?.closest?.("path.recharts-rectangle, path.recharts-sector");
      if (!shape || !host.contains(shape)) return null;
      const selector = shape.classList.contains("recharts-sector") ? "path.recharts-sector" : "path.recharts-rectangle";
      const shapes = Array.from(host.querySelectorAll(selector));
      const index = shapes.indexOf(shape);
      return index >= 0 ? { point: data[index % data.length], index: index % data.length, isBar: selector.includes("rectangle") } : null;
    };

    const render = (event) => {
      if (isDialysisBullet) {
        const rect = host.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const plotLeft = 42;
        const plotRight = 42;
        const usableWidth = Math.max(1, rect.width - plotLeft - plotRight);
        const cursorX = Math.max(0, Math.min(usableWidth, event.clientX - rect.left - plotLeft));
        const index = Math.max(0, Math.min(data.length - 1, Math.round((cursorX / usableWidth) * (data.length - 1))));
        const point = data[index] || {};
        setActiveBar(index);
        showCeoChartTooltip(card, tooltip, event, point.name || "", pointRows(point));
        return;
      }

      if (!isTrend && !isCapacity) {
        const match = shapePoint(event);
        if (!match?.point) {
          tooltip.hidden = true;
          clearActiveBar();
          return;
        }
        if (match.isBar) setActiveBar(match.index);
        showCeoChartTooltip(card, tooltip, event, match.point.name || props?.title || "", pointRows(match.point));
        return;
      }

      const rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const plotLeft = 42;
      const plotRight = isCapacity ? 42 : 12;
      const usableWidth = Math.max(1, rect.width - plotLeft - plotRight);
      const cursorX = Math.max(0, Math.min(usableWidth, event.clientX - rect.left - plotLeft));
      const index = Math.max(0, Math.min(data.length - 1, Math.round((cursorX / usableWidth) * (data.length - 1))));
      const point = data[index] || {};
      if (isCapacity) setActiveBar(index);
      showCeoChartTooltip(card, tooltip, event, point.name || "", pointRows(point));
    };

    host.addEventListener("mousemove", render);
    host.addEventListener("mouseleave", () => {
      tooltip.hidden = true;
      clearActiveBar();
    });
  }

  function attachCeoStaticTooltips(scope = document) {
    const tooltipSelector = "[data-ceo-tooltip-rows], [data-ceo-branch-donut-segments]";
    const targets = [
      ...(scope.matches?.(tooltipSelector) ? [scope] : []),
      ...Array.from(scope.querySelectorAll?.(tooltipSelector) || []),
    ];
    const cards = [...new Set(targets.map((target) => target.closest(".ceo-scan-card")).filter(Boolean))];

    cards.forEach((card) => {
      if (card.dataset.ceoStaticTooltipBound === "true") return;
      card.dataset.ceoStaticTooltipBound = "true";
      const tooltip = ensureCeoChartTooltip(card);

      card.addEventListener("mousemove", (event) => {
        const target = event.target?.closest?.("[data-ceo-tooltip-rows]");
        if (target && card.contains(target) && !target.closest("[hidden]")) {
          showCeoChartTooltip(card, tooltip, event, target.getAttribute("data-ceo-tooltip-title") || "", parseCeoTooltipRows(target));
          return;
        }

        const donut = event.target?.closest?.("[data-ceo-branch-donut-segments]");
        if (donut && card.contains(donut) && !donut.closest("[hidden]")) {
          const segment = ceoBranchDonutSegmentForEvent(donut, event);
          if (segment) {
            showCeoChartTooltip(card, tooltip, event, segment.title || "", segment.rows || []);
            return;
          }
        }

        tooltip.hidden = true;
      });

      card.addEventListener("mouseleave", () => {
        tooltip.hidden = true;
      });
    });
  }

  function ceoTrendChartContent({ title, labels, series, min = 0, max, unit = "", legend = true, fixedRange = false }) {
    const ranged = fixedRange ? { labels, series } : ceoRangeData(title, labels, series);
    labels = ranged.labels;
    series = ranged.series;
    const targetSeries = series.find((item) => item.tone === "target");
    const plottedSeries = series.filter((item) => item.tone !== "target");
    const keyedSeries = plottedSeries.map((item, index) => ({
      ...item,
      key: ceoChartKey(item.label, index),
    }));
    const data = labels.map((label, index) => {
      const point = { name: label };
      keyedSeries.forEach((item) => {
        point[item.key] = item.values[index];
      });
      point.__tooltipRows = keyedSeries.map((item, seriesIndex) => ({
        label: item.label,
        value: point[item.key],
        display: ceoTooltipValue(point[item.key], unit),
        color: item.color || ceoChartColor(item.tone, seriesIndex),
      }));
      if (targetSeries) {
        const targetValue = targetSeries.values[index];
        point.__tooltipRows.push({
          label: targetSeries.label,
          value: targetValue,
          display: ceoTooltipValue(targetValue, unit),
          color: ceoChartColor("target", keyedSeries.length),
        });
      }
      return point;
    });
    const chartSeries = keyedSeries.map((item, index) => ({
      key: item.key,
      name: item.label,
      color: item.color || ceoChartColor(item.tone, index),
      gradientId: `${ceoChartKey(title, 0)}_${item.key}_${index}`,
      area: !!item.area,
      dash: item.dash || (item.tone === "previous" ? "5 8" : undefined),
      strokeWidth: item.strokeWidth,
    }));
    const refValue = targetSeries ? { value: targetSeries.values[0], label: "Target" } : undefined;
    const config = ceoChartConfig("line", { data, series: chartSeries, refValue });

    return `
        <div class="ceo-scan-card-head">
          <div><span>${escapeHtml(title)}</span></div>
          ${fixedRange ? "" : ceoRangePicker(title)}
        </div>
        <div class="ceo-recharts-host ceo-recharts-host--trend" data-ceo-recharts="${config}" data-overview-chart-kind="trend" role="img" aria-label="${escapeHtml(title)}"></div>
        ${legend ? ceoChartLegend(series) : ""}
    `;
  }

  function ceoTrendChart(options) {
    const spec = {
      title: options.title,
      labels: options.labels || [],
      series: options.series || [],
      min: options.min ?? 0,
      max: options.max,
      unit: options.unit || "",
      legend: options.legend !== false,
      fixedRange: !!options.fixedRange,
    };

    return `
      <article class="ceo-scan-card ceo-scan-card--chart" data-ceo-trend-key="${escapeHtml(ceoChartKey(spec.title, 0))}" data-ceo-trend-spec="${escapeHtml(JSON.stringify(spec))}">
        ${ceoTrendChartContent(spec)}
      </article>
    `;
  }

  function ceoDialysisSessionsChart() {
    const timeline = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const scheduled = [45, 46, 44, 47, 46, 45, 48];
    const delivered = [44, 46, 42, 46, 45, 43, 48];
    const data = timeline.map((label, index) => {
      const missed = Math.max(0, scheduled[index] - delivered[index]);
      return {
        name: label,
        scheduled: scheduled[index],
        delivered: delivered[index],
        __tooltipRows: [
          { label: "Delivered Sessions", value: delivered[index], display: String(delivered[index]), color: "var(--color-primary)" },
          { label: "Scheduled Sessions", value: scheduled[index], display: String(scheduled[index]), color: "color-mix(in srgb, #f97316 22%, var(--color-surface))" },
          { label: "Missed Sessions", value: missed, display: String(missed), color: missed ? "#f97316" : "#2fbf7f" },
        ],
      };
    });
    const config = ceoChartConfig("bullet", { data, domainMin: 30 });

    return `
      <article class="ceo-scan-card ceo-scan-card--chart ceo-scan-card--dialysis-bullet">
        <div class="ceo-scan-card-head">
          <div><span>Dialysis Sessions</span></div>
        </div>
        <div class="ceo-recharts-host ceo-recharts-host--trend ceo-recharts-host--dialysis-bullet" data-ceo-recharts="${config}" data-overview-chart-kind="dialysis-bullet" role="img" aria-label="Daily dialysis delivered sessions over scheduled sessions"></div>
        <div class="ceo-scan-legend" aria-label="Chart legend">
          <span><i class="ceo-scan-legend-dot" style="background:var(--color-primary);"></i>Delivered Sessions</span>
          <span><i class="ceo-scan-legend-dot" style="background:color-mix(in srgb, #f97316 22%, var(--color-surface));"></i>Scheduled Sessions</span>
        </div>
      </article>
    `;
  }

  function ceoCapacityEfficiencyChart(occupancyValues, networkAlos) {
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const rawOccupancy = ceoDailyValues(occupancyValues || []).slice(0, 7).map((value) => Math.max(0, Math.min(100, Number(value || 0))));
    const dailyOccupancy = rawOccupancy.map((value, index) => {
      const normalized = value < 65 ? 72 + value * 0.28 : value;
      const dailyShape = [-2.4, -0.8, 1.2, 3.4, 0.2, -1.1, 2.1][index] || 0;
      return Math.max(64, Math.min(92, normalized + dailyShape));
    });
    const baseAlos = Number(networkAlos || zyephrDerived?.network?.alos || 4.3);
    const occupancyAverage = dailyOccupancy.reduce((sum, value) => sum + value, 0) / Math.max(dailyOccupancy.length, 1);
    const alosValues = dailyOccupancy.map((value, index) => {
      const pressureDrift = (value - occupancyAverage) * 0.035;
      const cadenceDrift = [-0.22, -0.08, 0.12, 0.32, 0.04, -0.18, 0.16][index] || 0;
      return Math.max(3.2, Math.min(5.8, baseAlos + pressureDrift + cadenceDrift));
    });
    const data = labels.map((label, index) => ({
      name: label,
      occupancy: Number(dailyOccupancy[index].toFixed(1)),
      alos: Number(alosValues[index].toFixed(2)),
      __tooltipRows: [
        {
          label: "Bed occupancy",
          value: Number(dailyOccupancy[index].toFixed(1)),
          display: `${dailyOccupancy[index].toFixed(1)}%`,
          color: "var(--color-primary)",
        },
        {
          label: "ALOS",
          value: Number(alosValues[index].toFixed(2)),
          display: `${alosValues[index].toFixed(2)}d`,
          color: "#f97316",
        },
      ],
    }));
    const config = ceoChartConfig("capacity", { data, target: 85 });

    return `
      <article class="ceo-scan-card ceo-capacity-efficiency-card">
        <div class="ceo-scan-card-head">
          <div>
            <span>Capacity & Efficiency</span>
          </div>
        </div>
        <div class="ceo-capacity-recharts-frame">
          <span class="ceo-capacity-axis-label ceo-capacity-axis-label--left">Bed occupancy</span>
          <div class="ceo-recharts-host ceo-recharts-host--capacity" data-ceo-recharts="${config}" data-overview-chart-kind="capacity" role="img" aria-label="Daily bed occupancy bars and ALOS trend line"></div>
          <span class="ceo-capacity-axis-label ceo-capacity-axis-label--right">ALOS</span>
        </div>
        <div class="ceo-capacity-legend">
          <span><i class="is-bar"></i> Bed occupancy</span>
          <span><i class="is-line"></i> ALOS</span>
          <span><i class="is-target"></i> Target</span>
        </div>
      </article>
    `;
  }

  function ceoBranchBarChart(title, rows, valueKey, unit = "") {
    const valueLabel = ceoTooltipMetricLabel(title);
    const data = rows.map((row, index) => {
      const name = row.branch || row.name;
      const value = Number(row[valueKey] || 0);
      const color = ceoBranchColor(name, index);
      return {
        name,
        value,
        color,
        __tooltipRows: [
          {
            label: valueLabel,
            value,
            display: ceoTooltipValue(value, unit),
            color,
          },
        ],
      };
    });
    const config = ceoChartConfig("bar", { data, colorBy: "branch", title, unit, valueLabel });
    return `
      <article class="ceo-scan-card">
        <div class="ceo-scan-card-head">
          <div><span>${escapeHtml(title)}</span></div>
        </div>
        <div class="ceo-recharts-host ceo-recharts-host--bar" data-ceo-recharts="${config}" data-overview-chart-kind="bar" role="img" aria-label="${escapeHtml(title)}"></div>
      </article>
    `;
  }

  function ceoDonutChart(title, rows, valueKey, unit = "%") {
    const valueLabel = ceoTooltipMetricLabel(title);
    const data = rows.map((row, index) => ({
      name: row.branch || row.name,
      value: row[valueKey],
      color: ceoBranchColor(row.branch || row.name, index),
      __tooltipRows: [
        {
          label: valueLabel,
          value: row[valueKey],
          display: ceoTooltipValue(row[valueKey], unit),
          color: ceoBranchColor(row.branch || row.name, index),
        },
      ],
    }));
    const config = ceoChartConfig("donut", { data, title, unit, valueLabel });
    return `
      <article class="ceo-scan-card ceo-scan-card--donut">
        <div class="ceo-scan-card-head">
          <div><span>${escapeHtml(title)}</span></div>
        </div>
        <div class="ceo-recharts-host ceo-recharts-host--donut" data-ceo-recharts="${config}" data-overview-chart-kind="donut" role="img" aria-label="${escapeHtml(title)}"></div>
      </article>
    `;
  }

  function ceoBranchContributionDonutContent(rows, totalRevenue) {
    const sortedRows = [...rows].sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0));
    const total = Number(totalRevenue || sortedRows.reduce((sum, row) => sum + Number(row.revenue || 0), 0) || 1);
    let offset = 0;
    const branchSegments = sortedRows.map((row, index) => {
      const revenue = Number(row.revenue || 0);
      const share = Math.max(0, (revenue / total) * 100);
      const start = offset;
      const end = offset + share;
      const color = ceoBranchColor(row.name || row.branch, index);
      offset = end;
      return {
        start,
        end,
        color,
        title: row.name || row.branch,
        rows: [
          { label: "Revenue", display: formatInrCr(revenue), color },
          { label: "Share", display: `${share.toFixed(1)}%`, color },
        ],
      };
    });
    const segments = ceoDonutGradientSegments(branchSegments);
    const leader = sortedRows.reduce(
      (best, row) => (Number(row.revenue || 0) > Number(best.revenue || 0) ? row : best),
      sortedRows[0] || {},
    );
    const leaderShare = total > 0 ? (Number(leader.revenue || 0) / total) * 100 : 0;

    return `
      <div class="ceo-branch-donut-layout">
        <div class="ceo-branch-donut" style="--donut:${escapeHtml(segments)};" role="img" aria-label="Revenue contribution by branch" data-ceo-branch-donut-segments="${escapeHtml(JSON.stringify(branchSegments))}">
          <div>
            <strong>${escapeHtml(`${leaderShare.toFixed(1)}%`)}</strong>
            <span>${escapeHtml(leader.name || leader.branch || "Top branch")}</span>
          </div>
        </div>
        <div class="ceo-branch-donut-legend">
          ${sortedRows
            .map((row, index) => {
              const revenue = Number(row.revenue || 0);
              const share = (revenue / total) * 100;
              const color = ceoBranchColor(row.name || row.branch, index);
              return `
                <div class="ceo-branch-donut-row" style="--branch-color:${escapeHtml(color)};">
                  <i></i>
                  <span>${escapeHtml(row.name || row.branch)}</span>
                  <strong>${escapeHtml(`${share.toFixed(1)}%`)}</strong>
                </div>
              `;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  function ceoDonutGradientSegments(segments) {
    const gapPercent = 0.42;
    return segments
      .flatMap((segment) => {
        const start = Number(segment.start || 0);
        const end = Number(segment.end || 0);
        const size = Math.max(0, end - start);
        const gap = Math.min(gapPercent, size / 4);
        const visualStart = start + gap / 2;
        const visualEnd = end - gap / 2;
        return [
          `var(--color-surface) ${start.toFixed(2)}% ${visualStart.toFixed(2)}%`,
          `${segment.color} ${visualStart.toFixed(2)}% ${visualEnd.toFixed(2)}%`,
          `var(--color-surface) ${visualEnd.toFixed(2)}% ${end.toFixed(2)}%`,
        ];
      })
      .join(", ");
  }

  function ceoRevenueDonutContent({ rows, total, ariaLabel }) {
    const sortedRows = [...rows].sort((a, b) => Number(b.value || 0) - Number(a.value || 0));
    const safeTotal = Math.max(1, Number(total || sortedRows.reduce((sum, row) => sum + Number(row.value || 0), 0) || 1));
    const leader = sortedRows.reduce(
      (best, row) => (Number(row.value || 0) > Number(best.value || 0) ? row : best),
      sortedRows[0] || {},
    );
    const leaderShare = (Number(leader.value || 0) / safeTotal) * 100;
    let offset = 0;
    const segmentDetails = sortedRows.map((row) => {
        const share = Math.max(0, (Number(row.value || 0) / safeTotal) * 100);
        const start = offset;
        const end = offset + share;
        offset += share;
        return {
          start,
          end,
          color: row.color,
          title: row.label,
          rows: [
            { label: "Revenue", display: formatInrCr(row.value), color: row.color },
            { label: "Share", display: `${share.toFixed(1)}%`, color: row.color },
          ],
        };
      });
    const segments = ceoDonutGradientSegments(segmentDetails);

    return `
      <div class="ceo-branch-donut-layout">
        <div class="ceo-driver-donut" style="--driver-donut:${escapeHtml(segments)};" role="img" aria-label="${escapeHtml(ariaLabel)}" data-ceo-branch-donut-segments="${escapeHtml(JSON.stringify(segmentDetails))}">
          <div>
            <strong>${escapeHtml(`${leaderShare.toFixed(1)}%`)}</strong>
            <span>${escapeHtml(leader.label || "Top segment")}</span>
          </div>
        </div>
        <div class="ceo-branch-donut-legend">
          ${sortedRows
            .map((row) => {
              const share = (Number(row.value || 0) / safeTotal) * 100;
              return `
                <div class="ceo-branch-donut-row" style="--branch-color:${escapeHtml(row.color)};">
                  <i></i>
                  <span>${escapeHtml(row.label)}</span>
                  <strong>${escapeHtml(`${share.toFixed(1)}%`)}</strong>
                </div>
              `;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  function ceoServiceLineRevenueRows(serviceLines, totalRevenue) {
    const sourceRows = Array.isArray(serviceLines) ? serviceLines : [];
    const valueFor = (matcher) => sourceRows.filter((row) => matcher(String(row.name || ""))).reduce((sum, row) => sum + Number(row.value || 0), 0);
    const sourceTotal = sourceRows.reduce((sum, row) => sum + Number(row.value || 0), 0);
    const total = Number(sourceTotal || totalRevenue || 1);
    const maintenanceDialysis = valueFor((name) => /dialysis/i.test(name));
    const transplant = valueFor((name) => /transplant|surgical|vascular/i.test(name));
    const generalNephrologyIpd = valueFor((name) => /ipd|ward/i.test(name));
    const opd = Math.max(0, total - maintenanceDialysis - transplant - generalNephrologyIpd);

    return [
      { label: "Maintenance Dialysis", value: maintenanceDialysis, color: ceoBranchPalette[0] },
      { label: "Transplant", value: transplant, color: ceoBranchPalette[1] },
      { label: "General Nephrology IPD", value: generalNephrologyIpd, color: ceoBranchPalette[2] },
      { label: "OPD", value: opd, color: ceoBranchPalette[3] },
    ];
  }

  function ceoPayorRevenueRows(payerMix, totalRevenue) {
    const sourceRows = Array.isArray(payerMix) ? payerMix : [];
    const valueFor = (matcher) => sourceRows.filter((row) => matcher(String(row.name || ""))).reduce((sum, row) => sum + Number(row.value || 0), 0);
    const sourceTotal = sourceRows.reduce((sum, row) => sum + Number(row.value || 0), 0);
    const total = Number(sourceTotal || totalRevenue || 1);
    const cash = valueFor((name) => /self|cash/i.test(name));
    const governmentSchemes = valueFor((name) => /government|cghs|echs|pmjay/i.test(name));
    const privateInsurance = Math.max(0, total - cash - governmentSchemes);

    return [
      { label: "Cash", value: cash, color: ceoBranchPalette[0] },
      { label: "Private Insurance", value: privateInsurance, color: ceoBranchPalette[1] },
      { label: "Government Schemes", value: governmentSchemes, color: ceoBranchPalette[2] },
    ];
  }

  function ceoDriverCarouselCard(rows, totalRevenue, opVisits, ipAdmissions, serviceLines) {
    const serviceRows = ceoServiceLineRevenueRows(serviceLines, totalRevenue);
    const serviceTotal = serviceRows.reduce((sum, row) => sum + Number(row.value || 0), 0);
    const payorRows = ceoPayorRevenueRows(zyephrDerived?.payerMix || [], totalRevenue);
    const payorTotal = payorRows.reduce((sum, row) => sum + Number(row.value || 0), 0);

    return `
      <article class="ceo-scan-card ceo-scan-card--drivers" data-ceo-driver-carousel>
        <div class="ceo-scan-card-head">
          <div><span data-ceo-driver-title>Revenue by Service Line</span></div>
          <div class="ceo-carousel-controls" aria-label="Revenue driver carousel controls">
            <button type="button" data-ceo-driver-prev aria-label="Previous driver">${hrmsSidebarIcon("chevron-left")}</button>
            <strong><span data-ceo-driver-index>1</span> / 3</strong>
            <button type="button" data-ceo-driver-next aria-label="Next driver">${hrmsSidebarIcon("chevron-right")}</button>
          </div>
        </div>
        <div class="ceo-driver-slides">
          <section class="ceo-driver-slide is-active" data-ceo-driver-slide="0" data-ceo-driver-label="Revenue by Service Line">
            ${ceoRevenueDonutContent({
              rows: serviceRows,
              total: serviceTotal,
              ariaLabel: "Revenue by service line",
            })}
          </section>
          <section class="ceo-driver-slide ceo-driver-slide--branch" data-ceo-driver-slide="1" data-ceo-driver-label="Branch Contribution" hidden>
            ${ceoBranchContributionDonutContent(rows, totalRevenue)}
          </section>
          <section class="ceo-driver-slide" data-ceo-driver-slide="2" data-ceo-driver-label="Revenue by Payor Mix" hidden>
            ${ceoRevenueDonutContent({
              rows: payorRows,
              total: payorTotal,
              ariaLabel: "Revenue by payor mix",
            })}
          </section>
        </div>
      </article>
    `;
  }

  function ceoSnapshotTable(title, summary, headers, rows) {
    const tableCell = (cell) => {
      if (cell && typeof cell === "object") {
        if (cell.html) return cell.html;
        if (cell.pill) return v2Pill(cell.value);
        const delta = cell.delta ? `<em class="ceo-scan-delta ${String(cell.delta).trim().startsWith("-") ? "is-down" : "is-up"}">${escapeHtml(cell.delta)}</em>` : "";
        return `<span class="ceo-scan-metric-cell"><span>${escapeHtml(cell.value)}</span>${delta}</span>`;
      }
      return escapeHtml(cell);
    };
    return `
      <article class="ceo-scan-card ceo-scan-card--table">
        <div class="ceo-scan-card-head">
          <div><span>${escapeHtml(title)}</span>${summary ? `<strong>${escapeHtml(summary)}</strong>` : ""}</div>
        </div>
        <div class="ceo-scan-table-wrap">
          <table class="ceo-scan-table">
            <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      ${row
                        .map((cell) => {
                          return `<td>${tableCell(cell)}</td>`;
                        })
                        .join("")}
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </article>
    `;
  }

  function ceoOccupancyHeatCell(value, delta) {
    const numericValue = Math.max(0, Math.min(100, Number(value || 0)));
    const tone = numericValue < 75 ? "red" : numericValue < 85 ? "amber" : "green";
    const deltaMarkup = delta ? `<em class="ceo-scan-delta ${String(delta).trim().startsWith("-") ? "is-down" : "is-up"}">${escapeHtml(delta)}</em>` : "";
    return {
      html: `
        <span class="ceo-occupancy-cell ceo-occupancy-cell--${tone}">
          <span class="ceo-occupancy-cell__top">
            <span>${escapeHtml(`${numericValue.toFixed(1)}%`)}</span>
            ${deltaMarkup}
          </span>
          <span class="ceo-occupancy-heat" aria-hidden="true">
            <i style="width:${numericValue.toFixed(1)}%"></i>
          </span>
        </span>
      `,
    };
  }

  function ceoNetworkSnapshotOccupancy(branch, index) {
    const rawValue = Number(branch.occupancy || 0);
    if (rawValue >= 65) return Math.max(62, Math.min(94, rawValue));
    const displayValues = [91.2, 78.4, 58.6, 87.8, 72.4, 83.1];
    return displayValues[index % displayValues.length];
  }

  function ceoBranchArpob(branch, index) {
    const value = Math.round((Number(branch.revenue || 0) * 10000000) / Math.max(1, Number(branch.opd || 0) + Number(branch.ip || 0) * 3));
    const fallback = [42500, 41700, 40200, 38900, 37600, 36800][index % 6];
    return Number.isFinite(value) && value > 0 ? Math.max(32000, Math.min(52000, value)) : fallback;
  }

  function ceoDialysisScheduleCell(branch, index) {
    const scheduled = [45, 44, 42, 40, 38, 36][index % 6];
    const delivered = Math.max(0, Math.min(scheduled, Math.round(scheduled * (Number(branch.dialysis || 0) / 100))));
    return `${delivered}/${scheduled}`;
  }

  function ceoNetworkSnapshotRisk(branch, occupancyValue) {
    const margin = Number(branch.margin || 0);
    const dialysis = Number(branch.dialysis || 0);
    if (occupancyValue >= 85 && margin >= 21 && dialysis >= 90) return "Low";
    if (occupancyValue < 65 || margin < 19 || dialysis < 78) return "High";
    return "Medium";
  }

  function executiveScoreMeter(score) {
    const numericScore = Math.max(0, Math.min(100, Number(score || 0)));
    const totalSegments = 33;
    const activeSegments = Math.round((numericScore / 100) * totalSegments);
    const centerX = 112;
    const centerY = 112;
    const innerRadius = 78;
    const outerRadius = 102;
    const bandColor = (index) => {
      const bandSize = totalSegments / 3;
      if (index < bandSize) return "var(--score-red)";
      if (index < bandSize * 2) return "var(--score-yellow)";
      return "var(--score-green)";
    };
    const segments = Array.from({ length: totalSegments }, (_, index) => {
      const progress = totalSegments === 1 ? 0 : index / (totalSegments - 1);
      const angle = Math.PI - progress * Math.PI;
      const x1 = centerX + Math.cos(angle) * innerRadius;
      const y1 = centerY - Math.sin(angle) * innerRadius;
      const x2 = centerX + Math.cos(angle) * outerRadius;
      const y2 = centerY - Math.sin(angle) * outerRadius;
      const color = index >= activeSegments ? "var(--score-muted)" : bandColor(index);
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}"></line>`;
    }).join("");
    return `
      <svg class="executive-score-arc" viewBox="0 0 224 118" role="img" aria-label="${numericScore}% score">
        <g>${segments}</g>
      </svg>
    `;
  }

  function executiveScoreCard({ label, score, state }) {
    const numericScore = Number(score || 0);
    const tone = numericScore >= 76 ? "stable" : numericScore >= 62 ? "attention" : "risk";
    return `
      <article class="executive-score-card executive-score-card--${tone}">
        <span>${escapeHtml(label)}</span>
        ${executiveScoreMeter(score)}
        <strong>${escapeHtml(String(score))}%</strong>
        <em>${escapeHtml(state)}</em>
      </article>
    `;
  }

  function executiveKpiIcon(label) {
    const normalized = String(label || "").toLowerCase();
    const common = `xmlns="http://www.w3.org/2000/svg" class="lucide executive-kpi-title-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"`;
    if (normalized.includes("revenue")) {
      return `<svg ${common}><path d="M6 3h12"></path><path d="M6 8h12"></path><path d="m6 13 8.5 8"></path><path d="M6 13h3"></path><path d="M9 13c6.667 0 6.667-10 0-10"></path></svg>`;
    }
    if (normalized.includes("ebitda") || normalized.includes("margin")) {
      return `<svg ${common}><path d="M16 7h6v6"></path><path d="m22 7-8.5 8.5-5-5L2 17"></path></svg>`;
    }
    if (normalized.includes("arpob")) {
      return `<svg ${common}><path d="M2 4v16"></path><path d="M2 8h18a2 2 0 0 1 2 2v10"></path><path d="M2 17h20"></path><path d="M6 8v9"></path></svg>`;
    }
    if (normalized.includes("opd") || normalized.includes("visit")) {
      return `<svg ${common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
    }
    if (normalized.includes("ipd") || normalized.includes("admission")) {
      return `<svg ${common}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><path d="m10 17 5-5-5-5"></path><path d="M15 12H3"></path></svg>`;
    }
    if (normalized.includes("alos")) {
      return `<svg ${common}><path d="M8 2v4"></path><path d="M16 2v4"></path><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M3 10h18"></path><path d="M12 14v3l2 1"></path></svg>`;
    }
    if (normalized.includes("tat")) {
      return `<svg ${common}><circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2.5 2.5"></path><path d="M9 2h6"></path></svg>`;
    }
    if (normalized.includes("pending")) {
      return `<svg ${common}><path d="M8 6h13"></path><path d="M8 12h13"></path><path d="M8 18h13"></path><path d="M3 6h.01"></path><path d="M3 12h.01"></path><path d="M3 18h.01"></path></svg>`;
    }
    if (normalized.includes("staff") || normalized.includes("coverage")) {
      return `<svg ${common}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><path d="M20 8v6"></path><path d="M23 11h-6"></path></svg>`;
    }
    if (normalized.includes("equip") || normalized.includes("uptime")) {
      return `<svg ${common}><rect x="3" y="4" width="18" height="14" rx="2"></rect><path d="M8 21h8"></path><path d="M12 18v3"></path><path d="m8 11 2 2 4-5"></path></svg>`;
    }
    if (normalized.includes("ot") || normalized.includes("utilization")) {
      return `<svg ${common}><path d="M3 3v18h18"></path><rect x="7" y="12" width="3" height="5" rx="1"></rect><rect x="12" y="8" width="3" height="9" rx="1"></rect><rect x="17" y="5" width="3" height="12" rx="1"></rect></svg>`;
    }
    if (normalized.includes("dialysis")) {
      return `<svg ${common}><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"></path><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"></path></svg>`;
    }
    if (normalized.includes("occupancy")) {
      return `<svg ${common}><path d="M2 4v16"></path><path d="M2 8h18a2 2 0 0 1 2 2v10"></path><path d="M2 17h20"></path><path d="M6 8v9"></path></svg>`;
    }
    if (normalized.includes("conversion")) {
      return `<svg ${common}><circle cx="18" cy="18" r="3"></circle><circle cx="6" cy="6" r="3"></circle><path d="M13 6h3a2 2 0 0 1 2 2v7"></path><path d="M11 18H8a2 2 0 0 1-2-2V9"></path></svg>`;
    }
    return `<svg ${common}><circle cx="12" cy="12" r="7"></circle><path d="M12 8v4l3 2"></path></svg>`;
  }

  function executiveKpiCard({ label, value, change, tone = "up" }) {
    return `
      <article class="executive-kpi-card">
        <span class="executive-kpi-title">${executiveKpiIcon(label)}<span>${escapeHtml(label)}</span></span>
        <div>
          <strong>${escapeHtml(value)}</strong>
          <em class="is-${escapeHtml(tone)}">${escapeHtml(change)}</em>
        </div>
      </article>
    `;
  }

  function executiveKpiSection({ role, score, kpis }) {
    return `
      <section class="executive-kpi-section executive-kpi-section--${escapeHtml(role.toLowerCase())}" aria-label="${escapeHtml(role)} KPI summary">
        ${executiveScoreCard(score)}
        <div class="executive-kpi-grid">
          ${kpis.map((kpi) => executiveKpiCard(kpi)).join("")}
        </div>
      </section>
    `;
  }

  function ceoExecutiveOverviewMarkup() {
    const overview = zyephrDerived?.overview || {};
    const network = zyephrDerived?.network || {};
    const derivedMonthly = zyephrDerived?.monthly || [];
    const latestMonth = derivedMonthly[derivedMonthly.length - 1] || {};
    const months = overview.monthLabels || ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    const revenue = overview.revenue || [33.2, 42.6, 37.4, 51.8, 44.1, 56.2];
    const revenuePrevious = overview.revenuePrevious || [30.8, 35.6, 34.0, 40.2, 37.1, 42.8];
    const revenueTarget = overview.revenueTarget || [46, 46, 46, 46, 46, 46];
    const occupancy = overview.occupancy || [81.2, 83.8, 84.2, 82.6, 80.1, 84.2];
    const opVisits = overview.opVisits || [7020, 7350, 7680, 7920, 8160, 8420];
    const ipAdmissions = overview.ipAdmissions || [840, 910, 980, 1020, 1060, 1120];
    const volumeByBranch = ceoVolumeRows.map((row) => ({ ...row, volume: row.op + row.ip }));
    const branchDeltas = overview.branchDeltas || {
      Westside: { revenue: "+11.2%", margin: "+2.6%", occupancy: "+1.4%", contribution: "+2%" },
      Eastview: { revenue: "+7.3%", margin: "+1.2%", occupancy: "+0.8%", contribution: "+1%" },
      Northgate: { revenue: "+6.8%", margin: "-0.9%", occupancy: "+0.3%", contribution: "+1%" },
      Southpoint: { revenue: "+3.5%", margin: "-2.4%", occupancy: "-0.4%", contribution: "0%" },
      Central: { revenue: "-0.8%", margin: "-3.6%", occupancy: "-1.5%", contribution: "-1%" },
      Riverside: { revenue: "-2.1%", margin: "-4.2%", occupancy: "-2.2%", contribution: "-2%" },
    };
    const networkRevenue = network.revenue ?? 42.8;
    const networkMargin = network.margin ?? 22.4;
    const networkOccupancy = network.occupancy ?? 84.2;
    const revenueDelta = latestMonth.prev ?? 4.2;
    const leadingBranches = [...v2Branches]
      .sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0))
      .slice(0, 2)
      .map((branch) => branch.name)
      .join(" and ");

    return `
      <section class="ceo-scan-page" data-ceo-executive-overview="true">
        <article class="ceo-scan-summary ceo-scan-summary--stable">
          <div class="ceo-signal-copy">
            <span class="ceo-signal-badge">Good morning, Sarah!</span>
            <p>Revenue is <strong>${escapeHtml(formatSignedPercent(revenueDelta))}</strong> month over month and service volume is <strong>+6.2%</strong>; ${escapeHtml(leadingBranches)} lead network contribution.</p>
            <div class="ceo-signal-actions">
              <a href="/finance?tab=revenue-analysis" class="ceo-signal-cta dashboard-link-action">View breakdown <span aria-hidden="true">→</span></a>
            </div>
          </div>
          <div class="ceo-signal-visual" aria-hidden="true">
            <img src="/assets/ceo-signal-hospital.png" alt="" loading="eager" decoding="async" />
          </div>
        </article>

        ${executiveKpiSection({
          role: "CEO",
          score: {
            label: "Network Health",
            score: 78,
            state: "Stable",
          },
          kpis: [
            {
              label: "Revenue vs Target",
              value: "₹70.5Cr",
              change: "↑ 5.7%",
              tone: "up",
            },
            {
              label: "EBITDA Margin",
              value: "21.8%",
              change: "↑ 1.2 pts",
              tone: "up",
            },
            {
              label: "ARPOB",
              value: "₹42,800",
              change: "↑ 3.4%",
              tone: "up",
            },
            {
              label: "Dialysis Sessions",
              value: "134 / 148",
              change: "90.5% Delivered",
              tone: "up",
            },
            {
              label: "Bed Occupancy",
              value: "84.2%",
              change: "↓ 1.2 pts",
              tone: "down",
            },
            {
              label: "OPD → IPD Conversion",
              value: "38.4%",
              change: "↑ 4.1 pts",
              tone: "up",
            },
          ],
        })}

        <section class="ceo-scan-grid">
          ${ceoTrendChart({
            title: "Revenue trend",
            labels: months,
            min: 0,
            max: 60,
            unit: "₹Cr",
            series: [
              { label: "Current period", values: revenue, tone: "primary", area: true, smooth: true },
              { label: previousComparisonLabel(), values: revenuePrevious, tone: "previous", smooth: true },
              { label: "Target", values: revenueTarget, tone: "target" },
            ],
          })}
          ${ceoDriverCarouselCard(v2Branches, networkRevenue, opVisits, ipAdmissions, zyephrDerived?.serviceLines || [])}
          ${ceoCapacityEfficiencyChart(occupancy, network.alos)}
          ${ceoDialysisSessionsChart()}
        </section>

        ${ceoSnapshotTable(
          "Network snapshot",
          "",
          ["Branch", "Revenue", "EBITDA margin", "Occupancy", "ARPOB", "Dialysis", "Risk"],
          v2Branches.map((branch, index) => {
            const delta = branchDeltas[branch.name] || {};
            const arpob = ceoBranchArpob(branch, index);
            const arpobDelta = ["+3.4%", "+2.8%", "+1.6%", "-0.9%", "-1.8%", "-2.2%"][index % 6];
            const occupancyValue = ceoNetworkSnapshotOccupancy(branch, index);
            const risk = ceoNetworkSnapshotRisk(branch, occupancyValue);
            return [
              branch.name,
              { value: `₹${branch.revenue.toFixed(1)}Cr`, delta: delta.revenue },
              { value: `${branch.margin.toFixed(1)}%`, delta: delta.margin },
              ceoOccupancyHeatCell(occupancyValue, delta.occupancy),
              { value: `₹${Number(arpob).toLocaleString("en-IN")}`, delta: arpobDelta },
              ceoDialysisScheduleCell(branch, index),
              { value: risk, pill: true },
            ];
          }),
        )}
      </section>
    `;
  }

  function ceoOverviewSignature(role) {
    return `${appState.branch}|${appState.timeframe}|${appState.comparison}|${JSON.stringify(ceoOverviewChartRanges)}|${role === "COO" ? "coo-scan-v3" : "ceo-scan-v2"}`;
  }

  function syncCeoOverviewSignature() {
    const container = mainPageContainer();
    if (!container || currentPath() !== "/overview") return;

    const role = activeRole();
    if (role === "CEO") {
      container.dataset.ceoExecutiveOverview = ceoOverviewSignature("CEO");
    } else if (role === "COO") {
      container.dataset.cooExecutiveOverview = ceoOverviewSignature("COO");
    }
  }

  function refreshCeoTrendCard(card) {
    const rawSpec = card?.getAttribute("data-ceo-trend-spec");
    if (!rawSpec) return false;

    let spec;
    try {
      spec = JSON.parse(rawSpec);
    } catch {
      return false;
    }

    const key = card.getAttribute("data-ceo-trend-key") || ceoChartKey(spec.title, 0);
    runWithObserverPaused(() => {
      card.outerHTML = ceoTrendChart(spec);
      syncCeoOverviewSignature();
    });

    const container = mainPageContainer();
    const replacement = [...(container?.querySelectorAll("[data-ceo-trend-key]") || [])].find((node) => node.getAttribute("data-ceo-trend-key") === key);
    if (!replacement) return false;

    mountCeoRecharts(replacement).then(() => disableChartMotion(replacement));
    return true;
  }

  function renderCeoExecutiveOverview() {
    if (currentPath() !== "/overview" || activeRole() !== "CEO") return false;
    const container = mainPageContainer();
    if (!container) return false;

    const signature = ceoOverviewSignature("CEO");
    if (container.dataset.ceoExecutiveOverview === signature) return true;

    container.dataset.ceoExecutiveOverview = signature;
    container.innerHTML = ceoExecutiveOverviewMarkup();
    attachCeoStaticTooltips(container);
    mountCeoRecharts();
    return true;
  }

  function cooStatusDot(tone = "online") {
    return `<i class="coo-status-dot coo-status-dot--${escapeHtml(tone)}" aria-hidden="true"></i>`;
  }

  function cooLiveBedHeatmap(branches) {
    const data = branches.map((branch, index) => {
      const occupancyValue = Number(branch.occupancy || 0) >= 65 ? Number(branch.occupancy || 0) : [91.2, 78.4, 86.6, 83.8][index % 4];
      const blocked = branch.risk === "High" ? 7 : branch.risk === "Medium" ? 4 : 2;
      const cleaning = [3, 2, 4, 3][index % 4];
      const occupied = Math.max(0, Math.min(100 - cleaning - blocked, occupancyValue));
      const available = Math.max(0, 100 - occupied - cleaning - blocked);

      return {
        name: branch.name,
        occupied: Number(occupied.toFixed(1)),
        cleaning,
        available: Number(available.toFixed(1)),
        blocked,
      };
    });
    const config = ceoChartConfig("bedStack", { data });

    return `
      <article class="ceo-scan-card coo-action-card coo-bed-heatmap">
        <div class="ceo-scan-card-head">
          <div><span>Live Bed Heatmap</span></div>
        </div>
        <div class="coo-bed-legend" aria-label="Bed status legend">
          <span>${cooStatusDot("occupied")}Occupied</span>
          <span><i class="coo-status-dot coo-status-dot--bed-cleaning" aria-hidden="true"></i>Cleaning</span>
          <span><i class="coo-status-dot coo-status-dot--bed-available" aria-hidden="true"></i>Available</span>
          <span>${cooStatusDot("blocked")}Blocked</span>
        </div>
        <div class="coo-bed-recharts-frame">
          <div class="ceo-recharts-host coo-recharts-host--beds" data-ceo-recharts="${config}" data-overview-chart-kind="bed-stack" role="img" aria-label="Live bed heatmap stacked by branch"></div>
        </div>
      </article>
    `;
  }

  function cooDischargePipeline(branches) {
    const blockers = ["Waiting on Finance", "Insurance approval", "Pharmacy clearance", "Doctor sign-off", "Transport pending"];
    const patients = branches.flatMap((branch, index) => [
      {
        branch: branch.name,
        patient: `PT-${String(index + 1).padStart(2, "0")}8${index}`,
        wait: 88 - index * 9,
        blocker: blockers[index % blockers.length],
        owner: index % 2 === 0 ? "Billing desk" : "Floor coordinator",
      },
      {
        branch: branch.name,
        patient: `PT-${String(index + 4).padStart(2, "0")}4${index}`,
        wait: 72 - index * 7,
        blocker: blockers[(index + 2) % blockers.length],
        owner: index % 2 === 0 ? "Insurance desk" : "Pharmacy",
      },
    ])
      .sort((a, b) => b.wait - a.wait)
      .slice(0, 5);

    return `
      <article class="ceo-scan-card coo-action-card">
        <div class="ceo-scan-card-head">
          <div><span>Discharge Pipeline</span></div>
        </div>
        <div class="coo-queue-list">
          ${patients
            .map(
              (item) => `
                <div class="coo-queue-row">
                  <div>
                    <strong>${escapeHtml(item.patient)} · ${escapeHtml(item.branch)}</strong>
                    <span>${escapeHtml(item.blocker)}</span>
                  </div>
                  <em>${escapeHtml(`${item.wait}m`)}</em>
                  <small>${escapeHtml(item.owner)}</small>
                </div>
              `,
            )
            .join("")}
        </div>
      </article>
    `;
  }

  function cooOtBoard(branches) {
    const otRows = [
      { room: "OT 1", status: "Running on time", progress: 82, tone: "available", branch: branches[0]?.name || "Whitefield" },
      { room: "OT 2", status: "Delayed by 45 mins", progress: 64, tone: "cleaning", branch: branches[1]?.name || "Jayanagar" },
      { room: "OT 3", status: "Idle · next case 3:40 PM", progress: 28, tone: "blocked", branch: branches[2]?.name || "Hebbal" },
      { room: "OT 4", status: "Turnover cleaning", progress: 48, tone: "occupied", branch: branches[3]?.name || "Electronic City" },
    ];

    return `
      <article class="ceo-scan-card coo-action-card">
        <div class="ceo-scan-card-head">
          <div><span>OT Board</span></div>
        </div>
        <div class="coo-resource-list">
          ${otRows
            .map(
              (item) => `
                <div class="coo-resource-row">
                  <div class="coo-live-row-head">
                    <strong>${escapeHtml(item.room)} · ${escapeHtml(item.branch)}</strong>
                    <span>${escapeHtml(item.status)}</span>
                  </div>
                  <div class="coo-progress" aria-hidden="true"><i style="width:${Number(item.progress).toFixed(0)}%"></i></div>
                  <em data-tone="${escapeHtml(item.tone)}">${cooStatusDot(item.tone)}${escapeHtml(`${item.progress}% used`)}</em>
                </div>
              `,
            )
            .join("")}
        </div>
      </article>
    `;
  }

  function cooEquipmentStatus(branches) {
    const items = [
      { name: "Dialysis Machines", detail: `${branches[0]?.name || "Whitefield"} Unit 4 - Down`, value: "1 Down", tone: "blocked" },
      { name: "Ventilators", detail: "ICU fleet online across branches", value: "Online", tone: "available" },
      { name: "Monitors", detail: `${branches[2]?.name || "Hebbal"} telemetry bay needs swap`, value: "1 Watch", tone: "cleaning" },
      { name: "RO Plant", detail: `${branches[1]?.name || "Jayanagar"} evening dialysis ready`, value: "Online", tone: "available" },
    ];

    return `
      <article class="ceo-scan-card coo-action-card">
        <div class="ceo-scan-card-head">
          <div><span>Critical Equipment Status</span></div>
        </div>
        <div class="coo-equipment-list">
          ${items
            .map(
              (item) => `
                <div class="coo-equipment-row">
                  <div>${cooStatusDot(item.tone)}<strong>${escapeHtml(item.name)}</strong></div>
                  <em data-tone="${escapeHtml(item.tone)}">${escapeHtml(item.value)}</em>
                  <span>${escapeHtml(item.detail)}</span>
                </div>
              `,
            )
            .join("")}
        </div>
      </article>
    `;
  }

  function cooOperationsLogRows(branches) {
    const departments = ["Bed Management", "Discharge Desk", "Theatre Ops", "Dialysis"];
    const bottlenecks = ["No ICU beds after 2 PM", "Finance clearance queue", "OT 2 delayed 45 mins", "Machine Unit 4 down"];
    const staffing = ["Short 2 ICU nurses", "Covered", "Short 1 scrub nurse", "Evening tech backup needed"];
    const alerts = [5, 3, 4, 2];
    const risks = ["High", "Medium", "Medium", "Low"];

    return branches.map((branch, index) => [
      branch.name,
      departments[index % departments.length],
      alerts[index % alerts.length],
      staffing[index % staffing.length],
      bottlenecks[index % bottlenecks.length],
      { value: risks[index % risks.length], pill: true },
    ]);
  }

  function cooExecutiveOverviewMarkup() {
    const focus = derivedRiskBranches(2);
    const focusCopy = focus.length ? focus.map((branch) => branch.name).join(" and ") : "branch operations";
    const liveBranches = v2Branches.slice(0, 4);

    return `
      <section class="ceo-scan-page" data-coo-executive-overview="true">
        <article class="ceo-scan-summary ceo-scan-summary--attention">
          <div class="ceo-signal-copy">
            <span class="ceo-signal-badge">Good morning, Sarah!</span>
            <p>Patient flow is stable across <strong>${escapeHtml(String(v2Branches.length))} branches</strong>; ${escapeHtml(focusCopy)} need closer operations review.</p>
            <div class="ceo-signal-actions">
              <a href="/operations?tab=patient-flow" class="ceo-signal-cta dashboard-link-action">Review operations <span aria-hidden="true">→</span></a>
            </div>
          </div>
          <div class="ceo-signal-visual" aria-hidden="true">
            <img src="/assets/ceo-signal-hospital.png" alt="" loading="eager" decoding="async" />
          </div>
        </article>

        ${executiveKpiSection({
          role: "COO",
          score: {
            label: "Operations Control",
            score: 72,
            state: "Attention",
          },
          kpis: [
            {
              label: "Bed Occupancy",
              value: "82%",
              change: "↑ 4 pts",
              tone: "warn",
            },
            {
              label: "OPD Visits",
              value: "1,284",
              change: "↑ 8.0%",
              tone: "up",
            },
            {
              label: "IPD Admissions",
              value: "84",
              change: "↑ 12.0%",
              tone: "warn",
            },
            {
              label: "ALOS",
              value: "4.1",
              change: "↑ 0.3 days",
              tone: "down",
            },
            {
              label: "Pending Discharges",
              value: "42",
              change: "↑ 8",
              tone: "down",
            },
            {
              label: "Discharge TAT",
              value: "3.8 hrs",
              change: "↑ 0.6 hrs",
              tone: "down",
            },
            {
              label: "Equip. Uptime",
              value: "94%",
              change: "2 Down",
              tone: "down",
            },
            {
              label: "OT Utilization",
              value: "76%",
              change: "↓ 5 pts",
              tone: "down",
            },
          ],
        })}

        <section class="ceo-scan-grid coo-live-action-grid">
          ${cooLiveBedHeatmap(liveBranches)}
          ${cooDischargePipeline(liveBranches)}
          ${cooOtBoard(liveBranches)}
          ${cooEquipmentStatus(liveBranches)}
        </section>

        ${ceoSnapshotTable(
          "Live Operations Log",
          "Who needs a call right now.",
          ["Branch", "Department", "Unresolved Alerts", "Staffing Gaps", "Current Bottleneck", "Status"],
          cooOperationsLogRows(liveBranches),
        )}
      </section>
    `;
  }

  function renderCooExecutiveOverview() {
    if (currentPath() !== "/overview" || activeRole() !== "COO") return false;
    const container = mainPageContainer();
    if (!container) return false;

    const signature = ceoOverviewSignature("COO");
    if (container.dataset.cooExecutiveOverview === signature) return true;

    container.dataset.cooExecutiveOverview = signature;
    container.innerHTML = cooExecutiveOverviewMarkup();
    attachCeoStaticTooltips(container);
    mountCeoRecharts();
    return true;
  }

  function v2ActionQueue(title, summary, items) {
    return `
      <article class="v2-panel v2-action-queue-panel">
        <div class="v2-panel-heading">
          <div><span>${escapeHtml(title)}</span><strong>${escapeHtml(summary)}</strong></div>
        </div>
        <div class="v2-action-queue">
          ${items
            .map(
              (item) => `
                <button type="button" class="v2-action-item v2-action-item--${v2StatusTone(item.status || "Open")}" data-v2-drawer="${escapeHtml(item.title)}" data-v2-kind="${escapeHtml(title)}" data-v2-status="${escapeHtml(item.status || "Open")}">
                  <span>
                    <em>${escapeHtml(item.label)}</em>
                    <strong>${escapeHtml(item.title)}</strong>
                  </span>
                  <p>${escapeHtml(item.detail)}</p>
                  ${v2Pill(item.status || "Open")}
                </button>
              `,
            )
            .join("")}
        </div>
      </article>
    `;
  }

  function hrmsMetrics() {
    const active = hrStaff.filter((staff) => staff.status === "Active").length;
    const onboarding = hrStaff.filter((staff) => /onboarding|offer/i.test(staff.status)).length;
    const biometricPending = hrStaff.filter((staff) => !/enrolled/i.test(staff.biometric)).length;
    const openRoles = hrDepartments.reduce((sum, department) => sum + department.open, 0);
    return v2MetricCards([
      { label: "Active Staff", value: String(active), delta: "Credentialed" },
      { label: "Open Roles", value: String(openRoles), delta: "Across departments" },
      { label: "Onboarding", value: String(onboarding), delta: "In progress" },
      { label: "Biometric Pending", value: String(biometricPending), delta: "Needs HRMS action" },
    ]);
  }

  function hrmsStaffTable() {
    return v2WorkflowTable(
      "Staff Directory",
      "Staff records scoped to HR Admin: identity, department, role, branch, and onboarding state.",
      ["Staff", "Department", "Role", "Branch", "Biometric", "Status"],
      hrStaff.map((staff) => [
        { value: staff.name, note: `${staff.id} · ${staff.role}` },
        staff.department,
        staff.role,
        staff.branch,
        { value: staff.biometric, status: /pending|not started/i.test(staff.biometric) ? "High" : staff.biometric },
        { value: staff.status, status: staff.status },
      ]),
    );
  }

  function hrmsPageActions(label, kind) {
    return `
      <div class="hrms-page-actions">
        <button type="button" class="hrms-primary-action" data-v2-drawer="${escapeHtml(label)}" data-v2-kind="${escapeHtml(kind)}" data-v2-status="Open">+ ${escapeHtml(label)}</button>
      </div>
    `;
  }

  function hrmsSelect(name, label, options, selected = options[0]) {
    return `
      <label class="hrms-field">
        <span>${escapeHtml(label)}</span>
        <select name="${escapeHtml(name)}">
          ${options.map((option) => `<option${option === selected ? " selected" : ""}>${escapeHtml(option)}</option>`).join("")}
        </select>
      </label>
    `;
  }

  function hrmsInput(name, label, placeholder, type = "text") {
    return `
      <label class="hrms-field">
        <span>${escapeHtml(label)}</span>
        <input name="${escapeHtml(name)}" type="${escapeHtml(type)}" placeholder="${escapeHtml(placeholder)}" />
      </label>
    `;
  }

  function hrmsStaffCreationForm(mode = "page") {
    const isDrawer = mode === "drawer";
    return `
      <article class="v2-panel hrms-create-panel ${isDrawer ? "hrms-create-panel--drawer" : ""}">
        <div class="v2-panel-heading">
          <div>
            <span>Staff onboarding</span>
            <strong>Create the employee record, biometric setup, and HRMS access in one workflow.</strong>
          </div>
          ${!isDrawer ? '<button type="button" class="hrms-primary-action" data-v2-drawer="Add staff" data-v2-kind="Staff onboarding" data-v2-status="Open">Open full form</button>' : ""}
        </div>
        <form class="hrms-staff-form" data-hrms-create-staff>
          <fieldset>
            <legend>Identity</legend>
            <div class="hrms-form-grid">
              ${hrmsInput("employeeId", "Employee ID", "EMP-1072")}
              ${hrmsInput("fullName", "Full name", "Enter staff name")}
              ${hrmsInput("phone", "Mobile", "+91 98765 43210", "tel")}
              ${hrmsInput("email", "Work email", "name@zyephros.local", "email")}
            </div>
          </fieldset>
          <fieldset>
            <legend>Assignment</legend>
            <div class="hrms-form-grid">
              ${hrmsSelect("branch", "Branch", hrBranches, "Westside")}
              ${hrmsSelect("department", "Department", hrDepartments.map((department) => department.name), "Nursing")}
              ${hrmsSelect("role", "Role / designation", hrRoleTemplates, "Senior Nurse")}
              ${hrmsSelect("shift", "Shift", ["Day", "Evening", "Night", "Rotational"], "Day")}
            </div>
          </fieldset>
          <fieldset>
            <legend>Biometrics</legend>
            <div class="hrms-biometric-setup">
              <label><input type="checkbox" name="fingerprint" checked /> Fingerprint capture</label>
              <label><input type="checkbox" name="faceId" /> Face ID photo</label>
              <label><input type="checkbox" name="badge" checked /> Badge / RFID issue</label>
              ${hrmsSelect("device", "Enrollment station", ["Westside Kiosk 1", "Central Kiosk 2", "Riverside Scanner", "Mobile kit"], "Westside Kiosk 1")}
            </div>
          </fieldset>
          <fieldset>
            <legend>Access provisioning</legend>
            <div class="hrms-access-checks">
              <label><input type="checkbox" checked /> HR profile</label>
              <label><input type="checkbox" checked /> Attendance</label>
              <label><input type="checkbox" /> Department roster</label>
              <label><input type="checkbox" /> Reports view</label>
            </div>
          </fieldset>
          <div class="hrms-form-actions">
            <button type="button" class="hrms-secondary-action" data-hrms-save-draft>Save draft</button>
            <button type="submit" class="hrms-primary-action">Create staff</button>
            <button type="button" class="hrms-secondary-action" data-hrms-schedule-biometric>Schedule biometric</button>
          </div>
          <p class="hrms-form-status" role="status" aria-live="polite"></p>
        </form>
      </article>
    `;
  }

  function hrmsCommandCentre() {
    return `
      <div class="hrms-command-grid">
        ${v2ActionQueue("Today Command Queue", "The work HR management needs to unblock now.", [
          { label: "Biometrics", title: "3 staff waiting for enrollment", detail: "Ravi, Farah, and Leena need device slots or consent capture.", status: "High" },
          { label: "Access", title: "7 HRMS accounts pending approval", detail: "Role templates selected, manager approval not complete.", status: "Watch" },
          { label: "Hiring", title: "28 open roles across departments", detail: "Nursing, ICU, and Dialysis carry the largest staffing gaps.", status: "Watch" },
          { label: "Compliance", title: "2 credentials expire this month", detail: "Clinical license refresh required before roster publication.", status: "High" },
        ])}
        ${hrmsOnboardingBoard()}
      </div>
      <div class="v2-workspace-split hrms-control-split">
        ${v2WorkflowTable(
          "Management Workbench",
          "Operational controls for staff onboarding, biometrics, access, and staffing pressure.",
          ["Control", "Current state", "Owner", "Next action", "Status"],
          [
            ["Create staff", "Ready", "HRMS Admin", "Add identity, assignment, biometrics", { value: "Open", status: "Low", drawer: "Add staff" }],
            ["Biometric queue", "3 pending", "HRMS Admin", "Book device slots today", { value: "High", status: "High" }],
            ["Access approvals", "7 pending", "IT Support", "Approve role templates", { value: "Watch", status: "Watch" }],
            ["Roster coverage", "Night gap", "Department heads", "Move float staff to ICU", { value: "Watch", status: "Watch" }],
          ],
        )}
        ${v2ActionQueue("Department Pressure", "Where staffing needs management action.", hrDepartments.slice(0, 4).map((department) => ({
          label: department.name,
          title: `${department.open} open roles`,
          detail: `${department.staff} staff · ${department.attendance}% attendance · ${department.biometric}% biometric coverage`,
          status: department.risk,
        })))}
      </div>
    `;
  }

  function hrmsStaffOpsBoard() {
    return `
      <div class="hrms-staff-workspace">
        ${hrmsStaffCreationForm("page")}
        <div class="hrms-staff-side">
          ${v2ActionQueue("Pending Staff Setup", "Records that still need onboarding work.", [
            { label: "EMP-1052", title: "Ravi Kumar", detail: "Dialysis · biometric pending · Riverside", status: "High" },
            { label: "EMP-1061", title: "Farah Ali", detail: "Revenue Cycle · documents pending · Central", status: "Watch" },
            { label: "EMP-1068", title: "Leena Joseph", detail: "Pharmacy · offer accepted · Northgate", status: "Watch" },
          ])}
          ${v2ActionQueue("Biometric Devices", "Stations available for new hires.", [
            { label: "Ready", title: "Westside Kiosk 1", detail: "Fingerprint and badge encoder online.", status: "Low" },
            { label: "Busy", title: "Central Kiosk 2", detail: "Next open slot 04:30 PM.", status: "Watch" },
            { label: "Offline", title: "Riverside Scanner", detail: "Escalated to IT support.", status: "High" },
          ])}
        </div>
      </div>
      ${hrmsStaffTable()}
    `;
  }

  function hrmsDepartmentMetrics() {
    const openRoles = hrDepartments.reduce((sum, department) => sum + department.open, 0);
    return v2MetricCards([
      { label: "Departments", value: String(hrDepartments.length), delta: "Active units" },
      { label: "Assigned Heads", value: `${hrDepartments.length}/${hrDepartments.length}`, delta: "Current coverage" },
      { label: "Open Roles", value: String(openRoles), delta: "Hiring demand" },
      { label: "Biometric Coverage", value: `${Math.round(hrDepartments.reduce((sum, department) => sum + department.biometric, 0) / hrDepartments.length)}%`, delta: "Across departments" },
    ]);
  }

  function hrmsDepartmentTable() {
    return v2WorkflowTable(
      "Department Directory",
      "Department ownership, staffing, hiring load, and biometric coverage.",
      ["Department", "Head", "Staff", "Open roles", "Biometric", "Status"],
      hrDepartments.map((department) => [
        department.name,
        department.head,
        String(department.staff),
        String(department.open),
        `${department.biometric}%`,
        { value: department.risk, status: department.risk },
      ]),
    );
  }

  function hrmsDepartmentBoard() {
    return `
      <article class="v2-panel hrms-department-board">
        <div class="v2-panel-heading">
          <div><span>Department Staffing</span><strong>Headcount, open roles, attendance, and biometric coverage by department.</strong></div>
        </div>
        <div class="hrms-department-grid">
          ${hrDepartments
            .map(
              (department) => `
                <button type="button" class="hrms-department-card" data-v2-drawer="${escapeHtml(department.name)}" data-v2-kind="Department" data-v2-status="${escapeHtml(department.risk)}">
                  <span>
                    <em>${escapeHtml(department.name)}</em>
                    ${v2Pill(department.risk)}
                  </span>
                  <strong>${department.staff} staff</strong>
                  <p>${department.open} open roles · ${department.head}</p>
                  <i><u style="--hrms-fill:${department.attendance}%"></u></i>
                  <small>${department.attendance}% attendance · ${department.biometric}% biometric</small>
                </button>
              `,
            )
            .join("")}
        </div>
      </article>
    `;
  }

  function hrmsOnboardingBoard() {
    return `
      <article class="v2-panel hrms-onboarding-board">
        <div class="v2-panel-heading">
          <div><span>Onboarding Pipeline</span><strong>New staff progress from offer acceptance to first-day access.</strong></div>
        </div>
        <div class="hrms-stage-grid">
          ${hrOnboardingStages
            .map(
              (stage) => `
                <button type="button" class="hrms-stage-card hrms-stage-card--${v2StatusTone(stage.status)}" data-v2-drawer="${escapeHtml(stage.name)}" data-v2-kind="Onboarding stage" data-v2-status="${escapeHtml(stage.status)}">
                  <span>${escapeHtml(stage.name)}</span>
                  <strong>${stage.count}</strong>
                  <em>${escapeHtml(stage.owner)}</em>
                  ${v2Pill(stage.status)}
                </button>
              `,
            )
            .join("")}
        </div>
      </article>
    `;
  }

  function hrmsBiometricBoard() {
    const rows = hrStaff.filter((staff) => !/enrolled/i.test(staff.biometric));
    return `
      <div class="v2-workspace-split hrms-biometric-layout">
        ${v2WorkflowTable(
          "Biometric Enrollment Queue",
          "Enroll fingerprints/face ID only after document and department assignment checks are complete.",
          ["Staff", "Department", "Branch", "Stage", "Biometric", "Owner"],
          rows.map((staff) => [
            { value: staff.name, note: `${staff.id} · ${staff.role}` },
            staff.department,
            staff.branch,
            staff.onboarding,
            { value: staff.biometric, status: staff.biometric },
            "HRMS Admin",
          ]),
        )}
        ${v2ActionQueue("Enrollment Stations", "Device readiness and same-day biometric slots.", [
          { label: "Device", title: "Westside kiosk ready", detail: "Use for same-day hires and cross-branch backup.", status: "Low" },
          { label: "Device", title: "Riverside scanner offline", detail: "Two onboarding records are waiting for enrollment.", status: "High" },
          { label: "Policy", title: "Consent capture required", detail: "Biometric consent must be recorded before enrollment.", status: "Watch" },
        ])}
      </div>
    `;
  }

  function hrmsAccessBoard() {
    return `
      <div class="v2-workspace-split">
        ${v2WorkflowTable(
          "HRMS RBAC Matrix",
          "HR Admin can manage staff and departments, but cannot access finance, operations, or clinical performance workspaces.",
          ["Area", "Permission", "Scope", "Restricted From", "Status"],
          [
            ["Staff directory", "Create / edit", "Employee profile, branch, department, shift", "Payroll amounts", { value: "Allowed", status: "Low" }],
            ["Departments", "Manage", "Department heads, open roles, staffing targets", "Finance margins", { value: "Allowed", status: "Low" }],
            ["Onboarding", "Run workflow", "Documents, medical clearance, access requests", "Patient records", { value: "Allowed", status: "Low" }],
            ["Biometrics", "Enroll / update", "Consent, device station, enrollment status", "Raw biometric data export", { value: "Controlled", status: "Watch" }],
            ["Dashboard", "View", "HRMS and HR reports only", "CEO/COO pages", { value: "Restricted", status: "High" }],
          ],
        )}
        ${v2ActionQueue("Access Controls", "RBAC decisions for this HR Admin role.", [
          { label: "Allowed", title: "Manage staff records", detail: "Create employees, update departments, and assign shifts.", status: "Low" },
          { label: "Allowed", title: "Complete onboarding", detail: "Track documents, clearance, access request, and biometrics.", status: "Low" },
          { label: "Restricted", title: "No finance or patient dashboards", detail: "CEO, COO, and clinical/finance pages redirect to HRMS.", status: "High" },
        ])}
      </div>
    `;
  }

  function hrmsStatusTag(status) {
    return `<span class="hrms-wire-status hrms-wire-status--${v2StatusTone(status)}">${escapeHtml(status)}</span>`;
  }

  function hrmsRoleTag(role) {
    return `<span class="hrms-role-tag">${hrmsSidebarIcon(role === "Owner" ? "shield" : role === "Doctor" ? "user-plus" : role === "No role" ? "file" : "users")} ${escapeHtml(role)}</span>`;
  }

  function hrmsWireMetric(icon, label, value, note) {
    return `
      <article class="hrms-wire-metric">
        <div>
          <span class="hrms-wire-icon">${hrmsSidebarIcon(icon)}</span>
          <strong>${escapeHtml(label)}</strong>
        </div>
        <b>${escapeHtml(value)}</b>
        <em>${escapeHtml(note)}</em>
      </article>
    `;
  }

  function hrmsWireToolbar(placeholder) {
    const isDepartment = placeholder.toLowerCase().includes("department");
    const noun = isDepartment ? "departments" : "staff";
    const departmentLabel = isDepartment ? "Head coverage" : "Department";
    const sortOptions = isDepartment
      ? ["Name: A to Z", "Staff count", "Head coverage", "Status"]
      : ["Name: A to Z", "Department: A to Z", "Role count", "Status"];
    return `
      <div class="hrms-wire-toolbar">
        <label class="hrms-wire-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>
          <input type="search" placeholder="${escapeHtml(placeholder)}" />
        </label>
        <div class="hrms-wire-control">
          <button type="button" class="hrms-wire-filter" aria-haspopup="true">${hrmsSidebarIcon("sliders")}<span>Filters</span><i></i></button>
          <div class="hrms-wire-popover hrms-wire-popover--filters">
            <h3>Filter ${escapeHtml(noun)}</h3>
            <div class="hrms-wire-filter-row">
              <label><input type="checkbox" /> <span>Status</span></label>
              <button type="button">All status (${isDepartment ? "7" : "15"})<i></i></button>
            </div>
            <div class="hrms-wire-filter-row">
              <label><input type="checkbox" /> <span>${escapeHtml(departmentLabel)}</span></label>
              <button type="button">${isDepartment ? "All heads (7)" : "All department (15)"}<i></i></button>
            </div>
            <div class="hrms-wire-popover-actions">
              <button type="button" class="hrms-wire-clear">Clear</button>
              <button type="button" class="hrms-wire-apply">Apply filters</button>
            </div>
          </div>
        </div>
        <div class="hrms-wire-control">
          <button type="button" class="hrms-wire-filter" aria-haspopup="true">${hrmsSidebarIcon("sort")}<span>Name: A to Z</span><i></i></button>
          <div class="hrms-wire-popover hrms-wire-popover--sort">
            ${sortOptions
              .map(
                (option, index) => `
                  <button type="button" class="${index === 0 ? "is-active" : ""}">
                    <span>${escapeHtml(option)}</span>
                    ${index === 0 ? "<strong>✓</strong>" : ""}
                  </button>
                `,
              )
              .join("")}
          </div>
        </div>
      </div>
    `;
  }

  function hrmsStaffWireframe() {
    const staffRows = [
      ["Ahmed Farouk", "ahmed.farouk@zyephr.health", "@ahmed.farouk", "Renal Diagnostics", "Staff", "Inactive"],
      ["Anita Rao", "anita.rao@zyephr.health", "@anita.rao", "Administration", "Owner", "Active"],
      ["Chen Wei", "chen.wei@zyephr.health", "@chen.wei", "Nephrology OPD", "Front Desk", "Active"],
      ["Diego Alves", "diego.alves@zyephr.health", "@diego.alves", "Dialysis Program", "No role", "Invited"],
      ["Elena Rossi", "elena.rossi@zyephr.health", "@elena.rossi", "Renal Diagnostics", "Doctor", "Active"],
      ["Fatima Bensalem", "fatima.b@zyephr.health", "@fatima.b", "Administration", "Manager", "Active"],
      ["Ines Moreau", "ines.moreau@zyephr.health", "@ines.moreau", "Renal ICU", "Nurse", "Active"],
      ["Ji-ho Park", "jiho.park@zyephr.health", "@ji-ho.park", "In-centre dialysis", "Nurse", "Active"],
      ["Lukas Schreiber", "lukas.s@zyephr.health", "@lukas.s", "-", "No role", "Invited"],
    ];
    return `
      <section class="hrms-wire-page">
        <div class="hrms-wire-hero">
          <div>
            <h2>Staff</h2>
            <p>People with access to Zyephr Health. Manage onboarding, departments and roles.</p>
          </div>
          <button type="button" class="hrms-primary-action" data-v2-drawer="Add staff" data-v2-kind="Staff onboarding" data-v2-status="Open">${hrmsSidebarIcon("user-plus")} Add staff</button>
        </div>
        <div class="hrms-wire-metrics">
          ${hrmsWireMetric("users", "Staff", "15", "Total accounts")}
          ${hrmsWireMetric("shield", "Active", "11", "Can sign in")}
          ${hrmsWireMetric("user-plus", "Invites", "2", "Pending setup")}
          ${hrmsWireMetric("file", "No role", "2", "Needs access")}
        </div>
        ${hrmsWireToolbar("Search by name, username, or email")}
        <article class="hrms-wire-table-card">
          <div class="hrms-wire-table hrms-wire-table--staff">
            <b>Name</b><b>Username</b><b>Department</b><b>Roles</b><b>Status</b><b></b>
            ${staffRows
              .map(([name, email, username, department, role, status]) => {
                const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2);
                return `
                  <div class="hrms-person"><span>${escapeHtml(initials)}</span><strong>${escapeHtml(name)}</strong><em>${escapeHtml(email)}</em></div>
                  <span class="hrms-mono">${escapeHtml(username)}</span>
                  <span>${escapeHtml(department)}</span>
                  <span>${hrmsRoleTag(role)}</span>
                  <span>${hrmsStatusTag(status)}</span>
                  <button type="button" class="hrms-row-arrow" data-v2-drawer="${escapeHtml(name)}" data-v2-kind="Staff" data-v2-status="${escapeHtml(status)}">›</button>
                `;
              })
              .join("")}
          </div>
        </article>
      </section>
    `;
  }

  function hrmsDepartmentsWireframe() {
    const departments = [
      ["Administration", "Operations and support", "ADMIN", "Anita Rao", "AR", "2", "Active"],
      ["Nephrology OPD", "Consults and chronic kidney care", "N-OPD", "Marcus Lee", "ML", "3", "Active"],
      ["Renal ICU", "High-acuity renal care", "RICU", "Sara Khan", "SK", "2", "Active"],
      ["Transplant Workup", "Evaluation and clearance pathway", "TXWK", "No head assigned", "", "0", "Inactive"],
      ["Dialysis Program", "HD, CAPD, and session operations", "DIAL", "No head assigned", "", "2", "Active"],
      ["Pharmacy", "Medication dispensing", "PHAR", "Naomi Tanaka", "NT", "2", "Active"],
      ["Renal Diagnostics", "Lab and renal imaging support", "RDX", "Elena Rossi", "ER", "3", "Active"],
    ];
    return `
      <section class="hrms-wire-page">
        <div class="hrms-wire-hero">
          <div>
            <h2>Departments</h2>
            <p>Care units and operational departments. Manage heads and active status.</p>
          </div>
          <button type="button" class="hrms-primary-action" data-v2-drawer="Add department" data-v2-kind="Department setup" data-v2-status="Open">+ Add department</button>
        </div>
        <div class="hrms-wire-metrics">
          ${hrmsWireMetric("building", "Total departments", "7", "6 active · 1 inactive")}
          ${hrmsWireMetric("users", "Operational units", "6", "Available for staff assignment")}
          ${hrmsWireMetric("shield", "Head coverage", "5/6", "1 active unit needs a head")}
          ${hrmsWireMetric("user-plus", "Staffing gaps", "0", "All active units have staff")}
        </div>
        ${hrmsWireToolbar("Search departments")}
        <article class="hrms-wire-table-card">
          <div class="hrms-wire-table hrms-wire-table--departments">
            <b>Department</b><b>Code</b><b>Head of department</b><b>Staff</b><b>Status</b><b></b>
            ${departments
              .map(([name, note, code, head, initials, staff, status]) => `
                <div class="hrms-dept-name"><strong>${escapeHtml(name)}</strong><em>${escapeHtml(note)}</em></div>
                <span class="hrms-mono">${escapeHtml(code)}</span>
                <span class="${head === "No head assigned" ? "hrms-no-head" : "hrms-head"}">${initials ? `<i>${escapeHtml(initials)}</i>` : ""}${escapeHtml(head)}</span>
                <span>${escapeHtml(staff)}</span>
                <span>${hrmsStatusTag(status)}</span>
                <button type="button" class="hrms-row-arrow" data-v2-drawer="${escapeHtml(name)}" data-v2-kind="Department" data-v2-status="${escapeHtml(status)}">›</button>
              `)
              .join("")}
          </div>
          <div class="hrms-wire-table-footer"><span>Showing 1-7 of 7 departments</span><span><button type="button">‹</button> 1 / 1 <button type="button">›</button></span></div>
        </article>
      </section>
    `;
  }

  function renderHrmsWorkspace(tab) {
    const activeTab = normalizeHrmsTab(tab);
    if (activeTab === "departments") {
      return hrmsDepartmentsWireframe();
    }

    if (activeTab === "staff") {
      return hrmsStaffWireframe();
    }

    if (activeTab === "access") {
      return `${hrmsMetrics()}${hrmsAccessBoard()}`;
    }

    return `
      ${hrmsMetrics()}
      ${hrmsCommandCentre()}
    `;
  }

  function v2FlowStageBoard(title, summary, stages) {
    const max = Math.max(...stages.map((stage) => stage.count), 1);
    return `
      <article class="v2-panel v2-stage-panel">
        <div class="v2-panel-heading">
          <div><span>${escapeHtml(title)}</span><strong>${escapeHtml(summary)}</strong></div>
        </div>
        <div class="v2-stage-flow">
          ${stages
            .map(
              (stage) => `
                <button type="button" class="v2-stage-card v2-stage-card--${v2StatusTone(stage.status || "Open")}" data-v2-drawer="${escapeHtml(stage.name)}" data-v2-kind="${escapeHtml(title)}" data-v2-status="${escapeHtml(stage.status || "Open")}">
                  <span>${escapeHtml(stage.name)}</span>
                  <strong>${escapeHtml(stage.display)}</strong>
                  <i style="--stage-width:${Math.max(12, (stage.count / max) * 100).toFixed(2)}%"></i>
                  <em>${escapeHtml(stage.owner || "")}</em>
                </button>
              `,
            )
            .join("")}
        </div>
      </article>
    `;
  }

  const v2DrillSeparator = "~";

  function v2CurrentDrillPath() {
    const raw = v2Params().get("drill");
    return raw ? raw.split(v2DrillSeparator).filter(Boolean) : ["total"];
  }

  function v2DrillPathValue(path) {
    return path.filter(Boolean).join(v2DrillSeparator);
  }

  function v2RevenueDrillLevels() {
    if (zyephrDerived) {
      const network = derivedNetwork();
      const nodeFromAmount = (row, index) => ({
        id: `${index}-${regExpEscape(row.name || row.label || "node").replace(/\\/g, "").replace(/\s+/g, "-").toLowerCase()}`,
        label: row.name || row.label,
        value: formatInrCr(row.value ?? row.revenue ?? row.total ?? row.amount),
        amount: Number(row.value ?? row.revenue ?? row.total ?? row.amount ?? 0),
        visits: Number(row.visits || row.patientVolume || row.opd || 0).toLocaleString("en-IN"),
        growth: formatSignedPercent(row.growth ?? row.revenueGrowth ?? 0),
        note: row.note || row.risk || "",
      });
      return [
        {
          id: "bill-amount",
          label: "Bill Amount",
          filter: "Revenue metric",
          nodes: [{ id: "total", label: "Total Revenue", value: formatInrCr(network.revenue), amount: Number(network.revenue || 0), visits: Number(network.patientVolume || 0).toLocaleString("en-IN"), growth: formatSignedPercent(zyephrDerived.monthly?.at(-1)?.prev || 0), note: "Network bill amount" }],
        },
        {
          id: "branch",
          label: "Centre Name",
          filter: "Centre name",
          nodes: v2Branches.map((branch, index) => nodeFromAmount(branch, index)),
        },
        {
          id: "patient-type",
          label: "Patient Mix",
          filter: "Patient mix",
          nodes: (zyephrDerived.revenuePerformanceRows?.["Patient Mix"] || []).slice(0, 6).map((row, index) => ({
            id: `${index}-${regExpEscape(row[0]).replace(/\\/g, "").replace(/\s+/g, "-").toLowerCase()}`,
            label: row[0],
            value: row[1],
            amount: Number(String(row[1]).replace(/[^\d.]/g, "")) || 0,
            visits: row[2],
            growth: row[3],
            note: row[5],
          })),
        },
        {
          id: "specialty",
          label: "Service Line",
          filter: "Service line",
          nodes: v2Departments.map((row, index) => nodeFromAmount(row, index)),
        },
        {
          id: "consultant",
          label: "Consultant",
          filter: "Consultant",
          nodes: (zyephrDerived.doctors || []).slice(0, 6).map((row, index) => nodeFromAmount(row, index)),
        },
        {
          id: "demographics",
          label: "Demographics",
          filter: "Demographics",
          nodes: (zyephrDerived.demographics || []).slice(0, 6).map((row, index) => nodeFromAmount(row, index)),
        },
      ];
    }
    return [
      {
        id: "bill-amount",
        label: "Bill Amount",
        filter: "Revenue metric",
        nodes: [{ id: "total", label: "Total Revenue", value: "₹42.8Cr", amount: 42.8, visits: "18,940", growth: "+4.2%", note: "Network bill amount" }],
      },
      {
        id: "branch",
        label: "Centre Name",
        filter: "Centre name",
        nodes: [
          { id: "westside", label: "Westside", value: "₹9.8Cr", amount: 9.8, visits: "4,820", growth: "+8.7%", note: "Highest contribution" },
          { id: "eastview", label: "Eastview", value: "₹8.7Cr", amount: 8.7, visits: "4,260", growth: "+7.3%", note: "Stable volume" },
          { id: "northgate", label: "Northgate", value: "₹7.6Cr", amount: 7.6, visits: "3,940", growth: "+6.8%", note: "Capacity watch" },
          { id: "southpoint", label: "Southpoint", value: "₹6.1Cr", amount: 6.1, visits: "3,310", growth: "+3.5%", note: "Moderate demand" },
          { id: "central", label: "Central", value: "₹5.4Cr", amount: 5.4, visits: "2,980", growth: "-0.8%", note: "Margin pressure" },
          { id: "riverside", label: "Riverside", value: "₹5.2Cr", amount: 5.2, visits: "2,710", growth: "-2.1%", note: "Risk contributor" },
        ],
      },
      {
        id: "patient-type",
        label: "Patient Type",
        filter: "Patient type",
        nodes: [
          { id: "op", label: "OP", value: "₹24.6Cr", amount: 24.6, visits: "12,480", growth: "+5.8%", note: "Outpatient revenue" },
          { id: "ip", label: "IP", value: "₹18.2Cr", amount: 18.2, visits: "6,460", growth: "+2.6%", note: "Inpatient revenue" },
        ],
      },
      {
        id: "specialty",
        label: "Service Line",
        filter: "Service line",
        nodes: [
          { id: "dialysis", label: "Dialysis", value: "₹8.4Cr", amount: 8.4, visits: "3,940", growth: "+6.4%", note: "Session volume driver" },
          { id: "ckd-clinic", label: "CKD Clinic", value: "₹7.9Cr", amount: 7.9, visits: "2,180", growth: "+5.1%", note: "Consult-to-care conversion" },
          { id: "kidney-transplant", label: "Kidney Transplant", value: "₹6.2Cr", amount: 6.2, visits: "1,840", growth: "+3.6%", note: "High acuity pathway" },
          { id: "aki-management", label: "AKI Management", value: "₹5.7Cr", amount: 5.7, visits: "1,420", growth: "+4.1%", note: "Acute renal care" },
          { id: "renal-diagnostics", label: "Renal Diagnostics", value: "₹3.6Cr", amount: 3.6, visits: "4,860", growth: "+1.7%", note: "Lab and imaging attach" },
          { id: "vascular-access", label: "Vascular Access", value: "₹3.4Cr", amount: 3.4, visits: "1,120", growth: "+2.8%", note: "AV fistula and catheter procedures" },
          { id: "hypertension-clinic", label: "Hypertension Clinic", value: "₹2.8Cr", amount: 2.8, visits: "1,060", growth: "+2.1%", note: "Medical nephrology follow-up" },
        ],
      },
      {
        id: "consultant",
        label: "Consultant",
        filter: "Consultant",
        nodes: [
          { id: "anand", label: "Dr. Anand", value: "₹3.1Cr", amount: 3.1, visits: "1,220", growth: "+7.8%", note: "Top contributor" },
          { id: "prashant", label: "Dr. Prashant", value: "₹2.2Cr", amount: 2.2, visits: "940", growth: "+5.4%", note: "Strong OP flow" },
          { id: "sheetal", label: "Dr. Sheetal", value: "₹1.2Cr", amount: 1.2, visits: "680", growth: "+2.2%", note: "Referral led" },
          { id: "nilesh", label: "Dr. Nilesh", value: "₹0.6Cr", amount: 0.6, visits: "310", growth: "-1.4%", note: "Volume watch" },
          { id: "mahesh", label: "Dr. Mahesh", value: "₹0.4Cr", amount: 0.4, visits: "260", growth: "+0.8%", note: "Low base" },
        ],
      },
      {
        id: "new-repeat",
        label: "New / Repeat",
        filter: "Patient new/repeat",
        nodes: [
          { id: "new", label: "New", value: "₹1.9Cr", amount: 1.9, visits: "780", growth: "+9.6%", note: "Acquisition signal" },
          { id: "repeat", label: "Repeat", value: "₹0.8Cr", amount: 0.8, visits: "420", growth: "+3.4%", note: "Retention signal" },
        ],
      },
      {
        id: "service-item",
        label: "Service Item",
        filter: "Service item",
        nodes: [
          { id: "hemodialysis-session", label: "Hemodialysis session", value: "₹0.72Cr", amount: 0.72, visits: "520", growth: "+8.1%", note: "Session revenue" },
          { id: "esa-therapy", label: "ESA therapy", value: "₹0.46Cr", amount: 0.46, visits: "410", growth: "+4.7%", note: "Anaemia care attach" },
          { id: "renal-panel", label: "Renal panel", value: "₹0.38Cr", amount: 0.38, visits: "680", growth: "+5.2%", note: "Diagnostics bundle" },
          { id: "av-fistula-care", label: "AV fistula care", value: "₹0.31Cr", amount: 0.31, visits: "96", growth: "+2.9%", note: "Access procedure" },
          { id: "transplant-workup", label: "Transplant workup", value: "₹0.22Cr", amount: 0.22, visits: "240", growth: "+1.8%", note: "Evaluation package" },
        ],
      },
    ];
  }

  function v2DrilldownBoard() {
    const levels = v2RevenueDrillLevels();
    const requestedPath = v2CurrentDrillPath();
    const path = [];
    for (let index = 0; index < levels.length; index += 1) {
      const fallback = index === 0 ? "total" : "";
      const requested = requestedPath[index] || fallback;
      if (!requested) break;
      const exists = levels[index].nodes.some((node) => node.id === requested);
      if (!exists) break;
      path.push(requested);
    }

    if (!path.length) path.push("total");

    const selectedNodes = path
      .map((id, index) => levels[index].nodes.find((node) => node.id === id))
      .filter(Boolean);
  const suppressNextDrillLevel = v2Params().get("drillClosed") === "1";
  const visibleLevelCount = Math.min(
    levels.length,
    Math.max(1, suppressNextDrillLevel ? path.length : path.length + 1),
  );
  const visibleLevels = levels.slice(0, visibleLevelCount);
    const drillFilterHeaderMarkup = visibleLevels
      .map((level, index) => {
        const node = selectedNodes[index];
        if (!node || index === 0) {
          return `<div class="v2-drill-filter-cell is-empty" style="--drill-filter-column:${index + 1}"></div>`;
        }

        return `
          <button
            type="button"
            class="v2-drill-filter-cell"
            style="--drill-filter-column:${index + 1}"
            data-v2-drill-truncate="${index}"
            aria-label="Clear ${escapeHtml(level.label)} filter"
          >
            <span>${escapeHtml(level.label)}</span>
            <strong>${escapeHtml(node.label)}</strong>
            <i aria-hidden="true">×</i>
          </button>
        `;
      })
      .join("");

    return `
      <div class="v2-drilldown-layout v2-drilldown-layout--wide">
        <article class="v2-panel v2-drilldown-canvas">
          <div class="v2-panel-heading">
            <div>
              <span>Revenue Drill Down</span>
              <p class="v2-drill-description">Select a node to reveal the next revenue dimension.</p>
            </div>
            <button type="button" class="v2-quiet-action" data-v2-drill-reset>Reset path</button>
          </div>
          <div class="v2-drill-canvas" role="application" aria-label="Interactive revenue drilldown canvas">
            <div class="v2-drill-stage" style="--drill-columns:${visibleLevels.length}">
              <svg class="v2-drill-connectors" aria-hidden="true"></svg>
              ${drillFilterHeaderMarkup}
              ${visibleLevels
                .map((level, levelIndex) => {
                  const selectedId = path[levelIndex];
                  const maxAmount = Math.max(...level.nodes.map((node) => node.amount), 1);
                  return `
                    <section class="v2-drill-level" data-v2-level="${escapeHtml(level.id)}">
                      <span class="v2-drill-level-label">${escapeHtml(level.label)}</span>
                      ${level.nodes
                        .map((node) => {
                          const selected = selectedId === node.id;
                          const inLockedPath = levelIndex < path.length && !selected;
                          const hasNext = selected && levelIndex < levels.length - 1;
                          const width = Math.max(8, (node.amount / maxAmount) * 100).toFixed(2);
                          return `
                            <button
                              type="button"
                              class="v2-drill-node ${selected ? "is-selected" : ""} ${hasNext ? "has-next" : ""} ${inLockedPath ? "is-muted" : ""}"
                              data-v2-drill-level="${levelIndex}"
                              data-v2-drill-node="${escapeHtml(node.id)}"
                              data-v2-drill-node-id="${escapeHtml(`${level.id}:${node.id}`)}"
                              aria-pressed="${String(selected)}"
                              style="--node-width:${width}%"
                            >
                              <i></i>
                              <span class="v2-drill-node-copy">
                                <strong>${escapeHtml(node.label)}</strong>
                                <em>${escapeHtml(node.value)}</em>
                              </span>
                              ${levelIndex < levels.length - 1 ? `<span class="v2-drill-node-expand" aria-hidden="true">+</span>` : ""}
                            </button>
                          `;
                        })
                        .join("")}
                    </section>
                  `;
                })
                .join("")}
            </div>
          </div>
        </article>
      </div>
    `;
  }

  function drawV2DrillConnectors() {
    document.querySelectorAll(".v2-drill-stage").forEach((stage) => {
      const svg = stage.querySelector(".v2-drill-connectors");
      if (!svg) return;

      const levels = [...stage.querySelectorAll(".v2-drill-level")];
      const stageRect = stage.getBoundingClientRect();
      const width = Math.max(stage.scrollWidth, stageRect.width);
      const height = Math.max(stage.scrollHeight, stageRect.height);
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svg.setAttribute("width", String(width));
      svg.setAttribute("height", String(height));
      svg.innerHTML = "";

      levels.slice(0, -1).forEach((level, index) => {
        const source = level.querySelector(".v2-drill-node.is-selected") || level.querySelector(".v2-drill-node");
        const nextLevel = levels[index + 1];
        const targets = nextLevel ? [...nextLevel.querySelectorAll(".v2-drill-node")] : [];
        if (!source || !targets.length) return;

        const sourceRect = source.getBoundingClientRect();
        const x1 = sourceRect.right - stageRect.left;
        const y1 = sourceRect.top - stageRect.top + sourceRect.height / 2;

        targets.forEach((target) => {
          const targetRect = target.getBoundingClientRect();
          const x2 = targetRect.left - stageRect.left;
          const y2 = targetRect.top - stageRect.top + targetRect.height / 2;
          const midX = x1 + (x2 - x1) / 2;
          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.setAttribute("d", `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`);
          path.setAttribute("class", `v2-drill-connector${target.classList.contains("is-selected") ? " is-selected" : ""}`);
          svg.appendChild(path);
        });
      });
    });
  }

  function derivedNetwork() {
    return zyephrDerived?.network || {};
  }

  function derivedRiskBranches(limit = 2) {
    return [...v2Branches]
      .sort((a, b) => {
        const riskScore = { High: 3, Medium: 2, Watch: 2, Low: 1 };
        return (riskScore[b.risk] || 0) - (riskScore[a.risk] || 0) || (b.revenue || 0) - (a.revenue || 0);
      })
      .slice(0, limit);
  }

  function derivedBranchListText(limit = 2) {
    return derivedRiskBranches(limit)
      .map((branch) => branch.name)
      .join(" · ");
  }

  function derivedBranchRows(columns = "finance") {
    if (columns === "ops") {
      return v2Branches.map((branch) => [
        { value: branch.name, note: `${branch.risk} risk` },
        Number(branch.opd || 0).toLocaleString("en-IN"),
        `${Number(branch.occupancy || 0).toFixed(1)}%`,
        `${Number(branch.alos || 0).toFixed(2)}d`,
        `${Number(branch.dialysis || 0).toFixed(1)}%`,
        `${Math.max(0, 100 - Number(branch.staffing || 0)).toFixed(1)}%`,
        { value: branch.risk, status: branch.risk },
      ]);
    }
    return v2Branches.map((branch) => [
      { value: branch.name, note: `${Number(branch.revenueContribution || 0).toFixed(1)}% contribution` },
      formatInrCr(branch.revenue),
      `${Number(branch.margin || 0).toFixed(1)}%`,
      `${Number(branch.collectionRate || 0).toFixed(1)}%`,
      `${Number(branch.occupancy || 0).toFixed(1)}%`,
      { value: branch.risk, status: branch.risk },
    ]);
  }

  function renderDerivedFinanceAnalysisTab(tab) {
    const network = derivedNetwork();
    if (tab === "ebitda-margin") {
      const rows = v2Branches.map((branch) => ({
        name: branch.name,
        margin: branch.margin,
        arpob: branch.arpob,
        revenue: branch.revenue,
        target: 22,
        display: `${Number(branch.margin || 0).toFixed(1)}%`,
        note: `${formatInrCr(branch.revenue)} revenue · ${branch.risk} risk`,
        status: branch.margin < 19 ? "High" : branch.margin < 21 ? "Watch" : "Low",
      }));
      return `
        ${v2MetricCards([
          { label: "EBITDA Margin", value: `${Number(network.margin || 0).toFixed(1)}%`, delta: "Network" },
          { label: "Network EBITDA", value: formatInrCr(network.ebitda), delta: `${v2Branches.length} branches` },
          { label: "ARPOB", value: `₹${Number(network.arpob || 0).toLocaleString("en-IN")}`, delta: `${Number(network.alos || 0).toFixed(1)}d ALOS` },
          { label: "Cost Pressure", value: derivedBranchListText(2) || "Low", delta: "Branch focus" },
        ])}
        <div class="v2-board-grid v2-board-grid--full">
          ${v2ArpobEbitdaBoard(rows)}
        </div>
        ${v2WorkflowTable("Branch Margin Snapshot", "Revenue, EBITDA, ARPOB, and operating risk by branch.", ["Branch", "Revenue", "EBITDA", "EBITDA Margin", "ARPOB", "Risk"], v2Branches.map((branch) => [
          { value: branch.name, note: `${branch.risk} risk` },
          formatInrCr(branch.revenue),
          formatInrCr(branch.ebitda),
          `${Number(branch.margin || 0).toFixed(1)}%`,
          `₹${Number(branch.arpob || 0).toLocaleString("en-IN")}`,
          { value: branch.risk, status: branch.risk },
        ]))}
      `;
    }

    if (tab === "payor-collections") {
      const payerRows = (zyephrDerived?.payerMix || []).slice(0, 5);
      const paymentRows = (zyephrDerived?.paymentStatus || []).slice(0, 5);
      return `
        ${v2MetricCards([
          { label: "Collection Rate", value: `${Number(network.collectionRate || 0).toFixed(1)}%`, delta: "Paid invoices" },
          { label: "Realization", value: `${Number(network.realizationRate || 0).toFixed(1)}%`, delta: "Paid + partial" },
          { label: "Pending Mix", value: paymentRows.find((row) => /pending/i.test(row.name)) ? `${paymentRows.find((row) => /pending/i.test(row.name)).share}%` : "0%", delta: "Invoices" },
          { label: "Payor Focus", value: payerRows[0]?.name || "Payor", delta: payerRows[0] ? `${payerRows[0].share}% share` : "" },
        ])}
        <div class="v2-board-grid">
          ${v2DriverBoard("Payer Mix", "Revenue share by payer type.", payerRows.map((row) => ({ name: row.name, value: row.share, display: `${row.share}%`, note: formatInrCr(row.value), status: row.share > 35 ? "Watch" : "Low" })))}
          ${v2DriverBoard("Payment Status Mix", "Invoice value by payment status.", paymentRows.map((row) => ({ name: row.name, value: row.share, display: `${row.share}%`, note: formatInrCr(row.value), status: /pending/i.test(row.name) ? "Watch" : "Low" })))}
        </div>
        ${v2WorkflowTable("Branch Collection Snapshot", "Collection rate and realization by branch.", ["Branch", "Revenue", "Paid", "Paid + Partial", "Risk", "Status"], v2Branches.map((branch) => [
          { value: branch.name, note: `${Number(branch.revenueContribution || 0).toFixed(1)}% network contribution` },
          formatInrCr(branch.revenue),
          `${Number(branch.collectionRate || 0).toFixed(1)}%`,
          `${Number(branch.realizationRate || 0).toFixed(1)}%`,
          branch.collectionRate < 80 ? "Collection watch" : "Normal",
          { value: branch.risk, status: branch.risk },
        ]))}
      `;
    }

    if (tab === "patient-mix") {
      const demographicRows = zyephrDerived?.demographics || [];
      const ckdRows = zyephrDerived?.ckdMix || [];
      return `
        ${v2MetricCards([
          { label: "Patients Served", value: Number(network.patientsServed || 0).toLocaleString("en-IN"), delta: `${network.year || ""}` },
          { label: "OPD Visits", value: Number(network.opd || 0).toLocaleString("en-IN"), delta: "Outpatient" },
          { label: "IPD Admissions", value: Number(network.ip || 0).toLocaleString("en-IN"), delta: `${Number(network.alos || 0).toFixed(1)}d ALOS` },
          { label: "Patient Volume", value: Number(network.patientVolume || 0).toLocaleString("en-IN"), delta: "OPD + IPD" },
        ])}
        <div class="v2-board-grid">
          ${v2DriverBoard("CKD Case Mix", "Patient acuity mix from patient master.", ckdRows.slice(0, 6).map((row) => ({ name: row.name, value: row.share, display: `${row.share}%`, note: `${Number(row.value).toLocaleString("en-IN")} patients` })))}
          ${v2DriverBoard("Revenue by Demographic", "Billing revenue grouped by gender and age band.", demographicRows.slice(0, 6).map((row) => ({ name: row.name, value: row.value, display: formatInrCr(row.value), note: `${Number(row.visits || 0).toLocaleString("en-IN")} invoices` })))}
        </div>
        ${v2WorkflowTable("Patient Segment Revenue Table", "Demographic revenue and invoice volume from billing data.", ["Segment", "Revenue", "Invoices", "Contribution", "Status"], demographicRows.slice(0, 8).map((row) => [
          row.name,
          formatInrCr(row.value),
          Number(row.visits || 0).toLocaleString("en-IN"),
          `${Number(row.conversion || 0).toFixed(1)}%`,
          { value: "Healthy", status: "Low" },
        ]))}
      `;
    }

    if (tab === "service-conversion") {
      const serviceRows = v2Departments.slice(0, 8);
      return `
        ${v2MetricCards([
          { label: "Total Visits", value: Number(network.patientVolume || 0).toLocaleString("en-IN"), delta: "OPD + IPD" },
          { label: "Service Lines", value: String(serviceRows.length), delta: "Billing groups" },
          { label: "Top Service", value: serviceRows[0]?.name || "Service", delta: serviceRows[0] ? formatInrCr(serviceRows[0].value) : "" },
          { label: "Collection", value: `${Number(network.realizationRate || 0).toFixed(1)}%`, delta: "Paid + partial" },
        ])}
        <div class="v2-board-grid">
          ${v2FunnelBoard("Service Conversion", "Patient volume converted into service-line billing.", [
            { name: "OPD Visits", value: network.opd || 0, display: Number(network.opd || 0).toLocaleString("en-IN") },
            { name: "IPD Admissions", value: network.ip || 0, display: Number(network.ip || 0).toLocaleString("en-IN") },
            { name: "Dialysis Sessions", value: network.dialysisSessions || 0, display: Number(network.dialysisSessions || 0).toLocaleString("en-IN") },
            { name: "OT Cases", value: network.otCases || 0, display: Number(network.otCases || 0).toLocaleString("en-IN") },
          ])}
          ${v2DriverBoard("Revenue by Service Line", "Revenue contribution by billing service group.", serviceRows.map((row) => ({ name: row.name, value: row.value, display: formatInrCr(row.value), note: `${Number(row.visits || 0).toLocaleString("en-IN")} invoices`, status: row.growth < 0 ? "Watch" : "Low" })))}
        </div>
        ${v2WorkflowTable("Service Conversion Table", "Service line revenue, invoice volume, realization, and movement.", ["Service Line", "Revenue", "Invoices", "Realization", "Growth", "Status"], serviceRows.map((row) => [
          row.name,
          formatInrCr(row.value),
          Number(row.visits || 0).toLocaleString("en-IN"),
          `${Number(row.conversion || 0).toFixed(1)}%`,
          formatSignedPercent(row.growth),
          { value: row.growth < 0 ? "Watch" : "Healthy", status: row.growth < 0 ? "Watch" : "Low" },
        ]))}
      `;
    }

    return v2DrilldownBoard();
  }

  function renderDerivedCapacityWorkspace(tab) {
    const network = derivedNetwork();
    if (tab === "occupancy") {
      return `
        ${v2MetricCards([
          { label: "Network Occupancy", value: `${Number(network.occupancy || 0).toFixed(1)}%`, delta: "ADT bed days" },
          { label: "Observed Beds", value: String(v2Branches.reduce((sum, branch) => sum + Number(branch.bedsObserved || 0), 0)), delta: "Distinct beds" },
          { label: "ALOS", value: `${Number(network.alos || 0).toFixed(2)}d`, delta: "Network" },
          { label: "Pressure Focus", value: derivedBranchListText(2), delta: "Branch risk" },
        ])}
        <div class="v2-board-grid">
          ${v2PressureBoard("Bed Pressure by Branch", "Occupancy derived from ADT occupied bed-days and observed beds.", v2Branches.map((branch) => ({ name: branch.name, value: branch.occupancy, display: `${Number(branch.occupancy || 0).toFixed(1)}%`, note: `${branch.bedsObserved || 0} observed beds · ${Number(branch.alos || 0).toFixed(2)}d ALOS`, status: branch.risk })), { max: 100, target: network.occupancy || 45, unit: "%" })}
          ${v2CompactMetricRail([
            { label: "Highest Revenue", value: v2Branches[0]?.name || "-", note: v2Branches[0] ? formatInrCr(v2Branches[0].revenue) : "" },
            { label: "Lowest Occupancy", value: [...v2Branches].sort((a, b) => a.occupancy - b.occupancy)[0]?.name || "-", note: "Derived from ADT" },
          ])}
        </div>
        ${v2WorkflowTable("Branch Capacity Detail", "Capacity, ALOS, ARPOB, and risk by branch.", ["Branch", "Occupancy", "Beds", "ALOS", "ARPOB", "Status"], v2Branches.map((branch) => [
          { value: branch.name, note: `${branch.ip} IPD admissions` },
          `${Number(branch.occupancy || 0).toFixed(1)}%`,
          String(branch.bedsObserved || 0),
          `${Number(branch.alos || 0).toFixed(2)}d`,
          `₹${Number(branch.arpob || 0).toLocaleString("en-IN")}`,
          { value: branch.risk, status: branch.risk },
        ]))}
      `;
    }

    if (tab === "alos") {
      return `
        ${v2MetricCards([
          { label: "Network ALOS", value: `${Number(network.alos || 0).toFixed(2)}d`, delta: "ADT discharge interval" },
          { label: "Longest ALOS", value: [...v2Branches].sort((a, b) => b.alos - a.alos)[0]?.name || "-", delta: `${Number([...v2Branches].sort((a, b) => b.alos - a.alos)[0]?.alos || 0).toFixed(2)}d` },
          { label: "IPD Admissions", value: Number(network.ip || 0).toLocaleString("en-IN"), delta: "Network" },
          { label: "ARPOB", value: `₹${Number(network.arpob || 0).toLocaleString("en-IN")}`, delta: "IP revenue / bed day" },
        ])}
        ${v2WorkflowTable("Branch Stay-Length Review", "ALOS and ARPOB from ADT and billing.", ["Branch", "ALOS", "Admissions", "ARPOB", "Revenue", "Status"], v2Branches.map((branch) => [
          { value: branch.name, note: `${branch.bedsObserved || 0} observed beds` },
          `${Number(branch.alos || 0).toFixed(2)}d`,
          Number(branch.ip || 0).toLocaleString("en-IN"),
          `₹${Number(branch.arpob || 0).toLocaleString("en-IN")}`,
          formatInrCr(branch.revenue),
          { value: branch.risk, status: branch.risk },
        ]))}
      `;
    }

    return `
      ${v2MetricCards([
        { label: "OPD Visits", value: Number(network.opd || 0).toLocaleString("en-IN"), delta: "Front door" },
        { label: "IPD Admissions", value: Number(network.ip || 0).toLocaleString("en-IN"), delta: "Bed flow" },
        { label: "OT Cases", value: Number(network.otCases || 0).toLocaleString("en-IN"), delta: "Procedures" },
        { label: "ED Visits", value: Number(network.edVisits || 0).toLocaleString("en-IN"), delta: "Emergency" },
      ])}
      ${v2WorkflowTable("Admissions and Flow Detail", "Branch-level operating volume from OPD, ADT, OT, and ED feeds.", ["Branch", "OPD", "IPD", "OT Cases", "ED Visits", "Status"], v2Branches.map((branch) => [
        { value: branch.name, note: `${branch.risk} risk` },
        Number(branch.opd || 0).toLocaleString("en-IN"),
        Number(branch.ip || 0).toLocaleString("en-IN"),
        Number(branch.otCases || 0).toLocaleString("en-IN"),
        Number(branch.edVisits || 0).toLocaleString("en-IN"),
        { value: branch.risk, status: branch.risk },
      ]))}
    `;
  }

  function renderDerivedOperationsWorkspace(tab) {
    const network = derivedNetwork();
    return `
      ${v2MetricCards([
        { label: "OPD Load", value: Number(network.opd || 0).toLocaleString("en-IN"), delta: "OPD visits" },
        { label: "IPD Admissions", value: Number(network.ip || 0).toLocaleString("en-IN"), delta: `${Number(network.alos || 0).toFixed(1)}d ALOS` },
        { label: "ED Door-to-Doctor", value: `${Number(v2Branches.reduce((sum, branch) => sum + Number(branch.edDoorToDoctor || 0), 0) / Math.max(v2Branches.length, 1)).toFixed(1)}m`, delta: "Average" },
        { label: "Staff Fill", value: `${Number(network.staffing || 0).toFixed(1)}%`, delta: "HR shifts" },
      ])}
      <div class="v2-board-grid">
        ${v2PressureBoard("Operational Load by Branch", "OPD volume and branch risk.", v2Branches.map((branch) => ({ name: branch.name, value: branch.opd, display: Number(branch.opd || 0).toLocaleString("en-IN"), note: `${Number(branch.ip || 0).toLocaleString("en-IN")} IPD · ${Number(branch.staffing || 0).toFixed(1)}% staffed`, status: branch.risk })), { max: Math.max(...v2Branches.map((branch) => branch.opd || 0), 1), target: network.opd / Math.max(v2Branches.length, 1), unit: "" })}
        ${v2DriverBoard("Equipment Uptime", "Biomedical running status by branch.", v2Branches.map((branch) => ({ name: branch.name, value: branch.equipmentUptime, display: `${Number(branch.equipmentUptime || 0).toFixed(1)}%`, note: `${Number(branch.staffing || 0).toFixed(1)}% staff fill`, status: branch.equipmentUptime < 90 ? "Watch" : "Low" })))}
      </div>
      ${v2WorkflowTable("Operations Detail", "OPD, IPD, ED, staffing, and equipment readiness by branch.", ["Branch", "OPD", "IPD", "ED Door-Doc", "Staff Fill", "Uptime", "Status"], v2Branches.map((branch) => [
        { value: branch.name, note: `${branch.risk} risk` },
        Number(branch.opd || 0).toLocaleString("en-IN"),
        Number(branch.ip || 0).toLocaleString("en-IN"),
        `${Number(branch.edDoorToDoctor || 0).toFixed(1)}m`,
        `${Number(branch.staffing || 0).toFixed(1)}%`,
        `${Number(branch.equipmentUptime || 0).toFixed(1)}%`,
        { value: branch.risk, status: branch.risk },
      ]))}
    `;
  }

  function renderDerivedDialysisWorkspace(role, tab) {
    const network = derivedNetwork();
    return `
      ${v2MetricCards([
        { label: "Dialysis Sessions", value: Number(network.dialysisSessions || 0).toLocaleString("en-IN"), delta: "Network" },
        { label: "Completion Rate", value: `${Number(v2Branches.reduce((sum, branch) => sum + Number(branch.dialysis || 0), 0) / Math.max(v2Branches.length, 1)).toFixed(1)}%`, delta: "Completed sessions" },
        { label: "Complication Rate", value: `${Number(v2Branches.reduce((sum, branch) => sum + Number(branch.dialysisComplicationRate || 0), 0) / Math.max(v2Branches.length, 1)).toFixed(1)}%`, delta: "Clinical" },
        { label: "Focus Branch", value: [...v2Branches].sort((a, b) => b.dialysisComplicationRate - a.dialysisComplicationRate)[0]?.name || "-", delta: "Complication rate" },
      ])}
      <div class="v2-workspace-split">
        ${v2DriverBoard("Dialysis Throughput", "Sessions and completion rate by branch.", v2Branches.map((branch) => ({ name: branch.name, value: branch.dialysisSessions, display: Number(branch.dialysisSessions || 0).toLocaleString("en-IN"), note: `${Number(branch.dialysis || 0).toFixed(1)}% completed`, status: branch.dialysisComplicationRate > 7.2 ? "Watch" : "Low" })))}
        ${v2DriverBoard("Dialysis Safety", "Complication rate by branch.", v2Branches.map((branch) => ({ name: branch.name, value: branch.dialysisComplicationRate, display: `${Number(branch.dialysisComplicationRate || 0).toFixed(1)}%`, note: `${Number(branch.dialysisSessions || 0).toLocaleString("en-IN")} sessions`, status: branch.dialysisComplicationRate > 7.2 ? "Watch" : "Low" })))}
      </div>
      ${v2WorkflowTable("Dialysis Branch Detail", "Sessions, completion, complications, and operating risk.", ["Branch", "Sessions", "Completion", "Complication Rate", "Uptime", "Staff Fill", "Status"], v2Branches.map((branch) => [
        { value: branch.name, note: `${branch.risk} risk` },
        Number(branch.dialysisSessions || 0).toLocaleString("en-IN"),
        `${Number(branch.dialysis || 0).toFixed(1)}%`,
        `${Number(branch.dialysisComplicationRate || 0).toFixed(1)}%`,
        `${Number(branch.equipmentUptime || 0).toFixed(1)}%`,
        `${Number(branch.staffing || 0).toFixed(1)}%`,
        { value: branch.risk, status: branch.risk },
      ]))}
    `;
  }

  function renderDerivedRevenueCycleWorkspace(tab) {
    const network = derivedNetwork();
    const payerRows = zyephrDerived?.payerMix || [];
    const paymentRows = zyephrDerived?.paymentStatus || [];
    return `
      ${v2MetricCards([
        { label: "Net Revenue", value: formatInrCr(network.revenue), delta: `${network.year || ""}` },
        { label: "Paid Collection", value: `${Number(network.collectionRate || 0).toFixed(1)}%`, delta: "Paid invoices" },
        { label: "Paid + Partial", value: `${Number(network.realizationRate || 0).toFixed(1)}%`, delta: "Realization" },
        { label: "Payor Focus", value: payerRows[0]?.name || "-", delta: payerRows[0] ? `${payerRows[0].share}% share` : "" },
      ])}
      <div class="v2-board-grid">
        ${v2DriverBoard("Payment Status", "Billing value by payment status.", paymentRows.map((row) => ({ name: row.name, value: row.share, display: `${row.share}%`, note: formatInrCr(row.value), status: /pending/i.test(row.name) ? "Watch" : "Low" })))}
        ${v2DriverBoard("Payer Mix", "Revenue value by payer type.", payerRows.map((row) => ({ name: row.name, value: row.share, display: `${row.share}%`, note: formatInrCr(row.value), status: row.share > 35 ? "Watch" : "Low" })))}
      </div>
      ${v2WorkflowTable("Revenue Cycle Branch Detail", "Revenue and collection indicators by branch.", ["Branch", "Revenue", "Paid", "Paid + Partial", "Payer Risk", "Status"], v2Branches.map((branch) => [
        { value: branch.name, note: `${Number(branch.revenueContribution || 0).toFixed(1)}% contribution` },
        formatInrCr(branch.revenue),
        `${Number(branch.collectionRate || 0).toFixed(1)}%`,
        `${Number(branch.realizationRate || 0).toFixed(1)}%`,
        branch.collectionRate < 80 ? "Watch" : "Normal",
        { value: branch.risk, status: branch.risk },
      ]))}
    `;
  }

  function renderDerivedBranchesWorkspace(role, tab) {
    const network = derivedNetwork();
    if (tab === "service-performance") {
      return `
        ${v2MetricCards([
          { label: "Service Lines", value: String(v2Departments.length), delta: "Billing groups" },
          { label: "Top Service", value: v2Departments[0]?.name || "-", delta: v2Departments[0] ? formatInrCr(v2Departments[0].value) : "" },
          { label: "Patient Volume", value: Number(network.patientVolume || 0).toLocaleString("en-IN"), delta: "OPD + IPD" },
          { label: "Branch Focus", value: derivedBranchListText(2), delta: "Risk" },
        ])}
        <div class="v2-board-grid">
          ${v2DriverBoard("Service Revenue", "Service-line contribution from billing invoices.", v2Departments.slice(0, 8).map((row) => ({ name: row.name, value: row.value, display: formatInrCr(row.value), note: `${Number(row.visits || 0).toLocaleString("en-IN")} invoices`, status: row.growth < 0 ? "Watch" : "Low" })))}
          ${v2BranchDecisionBoard("Branch Service Focus", "Service readiness by branch.", v2Branches.map((branch) => ({ branch: branch.name, primary: `${Number(branch.dialysisSessions || 0).toLocaleString("en-IN")} dialysis`, detail: `${Number(branch.opd || 0).toLocaleString("en-IN")} OPD · ${Number(branch.otCases || 0).toLocaleString("en-IN")} OT cases`, status: branch.risk })))}
        </div>
      `;
    }

    return `
      ${v2MetricCards([
        { label: "Top Branch", value: v2Branches[0]?.name || "-", delta: v2Branches[0] ? formatInrCr(v2Branches[0].revenue) : "" },
        { label: "Network Revenue", value: formatInrCr(network.revenue), delta: `${v2Branches.length} branches` },
        { label: "Under Pressure", value: derivedBranchListText(2), delta: "Risk focus" },
        { label: "Network ALOS", value: `${Number(network.alos || 0).toFixed(2)}d`, delta: "ADT" },
      ])}
      <div class="v2-workspace-split">
        ${v2BranchDecisionBoard("Branch Decision Board", "Real branch comparison from the workbook-derived branch model.", v2Branches.map((branch) => ({ branch: branch.name, primary: `${formatInrCr(branch.revenue)} revenue`, detail: `${Number(branch.occupancy || 0).toFixed(1)}% occ · ${Number(branch.collectionRate || 0).toFixed(1)}% paid · ${Number(branch.staffing || 0).toFixed(1)}% staff`, status: branch.risk })))}
        ${v2ActionQueue("Decision Queue", "Branches sorted by current risk.", derivedRiskBranches(3).map((branch) => ({ label: branch.risk, title: branch.name, detail: `${formatInrCr(branch.revenue)} revenue · ${Number(branch.alos || 0).toFixed(2)}d ALOS · ${Number(branch.equipmentUptime || 0).toFixed(1)}% uptime`, status: branch.risk })))}
      </div>
      ${v2WorkflowTable("Branch Comparison Detail", "Stable branch comparison columns across the page.", ["Branch", "Revenue", "Margin", "Collection", "Occupancy", "Status"], derivedBranchRows("finance"))}
    `;
  }

  function renderFinanceAnalysisTab(tab) {
    if (zyephrDerived) return renderDerivedFinanceAnalysisTab(tab);
    if (tab === "ebitda-margin") {
      const rows = v2Branches.map((branch) => ({
        name: branch.name,
        margin: branch.margin,
        arpob: Math.round(({ Westside: 41200, Eastview: 38900, Northgate: 37400, Southpoint: 35200, Central: 38100, Riverside: 40400 }[branch.name] || 36000) / 100) * 100,
        revenue: branch.revenue,
        target: 22,
        display: `${branch.margin}%`,
        note: `₹${branch.revenue}Cr revenue · ${branch.risk} risk`,
        status: branch.margin < 19 ? "High" : branch.margin < 21 ? "Watch" : "Low",
      }));
      return `
        ${v2MetricCards([
          { label: "EBITDA Margin", value: "22.4%", delta: "+1.2pp" },
          { label: "Network EBITDA", value: "₹9.6Cr", delta: "+₹0.8Cr" },
          { label: "Target Gap", value: "+0.4pp", delta: "Above plan" },
          { label: "Cost Pressure", value: "Medium", delta: "2 branches" },
        ])}
        <div class="v2-board-grid v2-board-grid--full">
          ${v2ArpobEbitdaBoard(rows)}
        </div>
        ${v2Table(["Branch", "Revenue", "EBITDA", "EBITDA Margin", "Margin vs Target", "Cost Pressure", "Risk"], [
          ["Westside", "₹9.8Cr", "₹2.4Cr", "24.6%", "+2.6pp", "Low", "Low"],
          ["Eastview", "₹8.7Cr", "₹2.0Cr", "23.2%", "+1.2pp", "Low", "Low"],
          ["Northgate", "₹7.6Cr", "₹1.6Cr", "21.1%", "-0.9pp", "Consumables", "Medium"],
          ["Central", "₹5.4Cr", "₹1.0Cr", "18.4%", "-3.6pp", "Staffing", "High"],
        ], "Branch Margin Snapshot")}
      `;
    }

    if (tab === "payor-collections") {
      return `
        ${v2MetricCards([
          { label: "Pending Exposure", value: "₹6.8Cr", delta: "-₹0.4Cr" },
          { label: "90+ Aging", value: "₹1.1Cr", delta: "High focus" },
          { label: "Collection Risk", value: "Medium", delta: "2 branches" },
          { label: "Expected Closure", value: "11d", delta: "Target 9d" },
        ])}
        <div class="v2-board-grid">
          ${v2BucketBoard("Pending Exposure", ["0-30", "31-60", "61-90", "90+"], [
            { name: "Insurance", values: [42, 31, 18, 12] },
            { name: "TPA", values: [34, 27, 22, 16] },
            { name: "Corporate", values: [26, 18, 10, 7] },
            { name: "Government", values: [18, 16, 14, 11] },
            { name: "Cash", values: [11, 7, 4, 2] },
          ])}
          ${v2CompactMetricRail([
            { label: "Payor Mix", value: "Insurance 41%", note: "Largest revenue share and highest review load." },
            { label: "Aging Signal", value: "TPA watch", note: "Queries aging into 90+ bucket." },
            { label: "Next Action", value: "Central", note: "Review 61-90 and 90+ exposure." },
          ])}
        </div>
        ${v2Table(["Branch", "Payor", "Pending Amount", "Aging Bucket", "Collection Risk", "Expected Closure", "Status"], [
          ["Central", "TPA", "₹1.2Cr", "90+", "High", "18 Jun", "High"],
          ["Riverside", "Government", "₹0.8Cr", "61-90", "Medium", "21 Jun", "Watch"],
          ["Northgate", "Insurance", "₹0.6Cr", "31-60", "Medium", "16 Jun", "Medium"],
          ["Westside", "Cash", "₹0.2Cr", "0-30", "Low", "12 Jun", "Low"],
        ], "Collection Risk Snapshot")}
      `;
    }

    if (tab === "patient-mix") {
      return `
        ${v2MetricCards([
          { label: "Total Patients", value: "18,420", delta: "+5.1%" },
          { label: "New Patients", value: "6,210", delta: "+8.4%" },
          { label: "Repeat Patients", value: "12,210", delta: "+3.0%" },
          { label: "Repeat Revenue", value: "62%", delta: "Healthy" },
        ])}
        <div class="v2-board-grid">
          ${v2TileGrid("Patient Mix", "Demographic and retention BI grid.", [
            { label: "Age profile", title: "31-45", value: "32%", note: "Largest unique patient segment." },
            { label: "Revenue + ARPOB", title: "46-60", value: "₹38k", note: "Highest revenue per patient." },
            { label: "New vs Repeat", title: "Repeat", value: "66%", note: "Stable returning base." },
            { label: "Channel / Payor", title: "Insurance", value: "41%", note: "Dominant payor channel." },
          ])}
          ${v2CompactMetricRail([
            { label: "Retention Signal", value: "Good", note: "<90 day repeat cohort improving." },
            { label: "Risk", value: "New patient dependency", note: "Southpoint relies heavily on first visits." },
            { label: "Report", value: "Retention Report", note: "Open via Reports for cohort export." },
          ])}
        </div>
        ${v2DriverBoard("Retention Window", "Repeat visit window by cohort.", [
          { name: "<30 days", value: 28, display: "28%", note: "Fast return" },
          { name: "<60 days", value: 46, display: "46%", note: "Healthy" },
          { name: "<90 days", value: 61, display: "61%", note: "Target cohort" },
          { name: "<120 days", value: 72, display: "72%", note: "Watch" },
          { name: "<180 days", value: 84, display: "84%", note: "Long-cycle return" },
        ])}
        ${v2Table(["Segment", "Patients", "Revenue", "Revenue per Patient", "Repeat %", "Growth", "Status"], [
          ["Female 31-45", "3,820", "₹8.4Cr", "₹22k", "69%", "+7.2%", "Low"],
          ["Male 46-60", "3,140", "₹7.9Cr", "₹25k", "63%", "+5.1%", "Low"],
          ["Senior 60+", "2,280", "₹6.1Cr", "₹27k", "58%", "+2.4%", "Watch"],
        ], "Patient Segment Revenue Table")}
      `;
    }

    if (tab === "service-conversion") {
      return `
        ${v2MetricCards([
          { label: "Total Visits", value: "28,420", delta: "+4.2%" },
          { label: "Lab Conversion", value: "23.5%", delta: "+1.8pp" },
          { label: "Pharmacy Conversion", value: "31.2%", delta: "+2.4pp" },
          { label: "Revenue Impact", value: "₹2.4Cr", delta: "Open upside" },
        ])}
        <div class="v2-board-grid">
          ${v2FunnelBoard("Service Conversion", "OPD visit to lab/pharmacy conversion path.", [
            { name: "OPD Visits", value: 28420, display: "28,420" },
            { name: "With Orders", value: 11320, display: "11,320" },
            { name: "Lab Orders", value: 6680, display: "6,680" },
            { name: "Lab Visits", value: 5020, display: "5,020" },
            { name: "Pharmacy Visits", value: 8860, display: "8,860" },
          ])}
          ${v2CompactMetricRail([
            { label: "Lowest lab conversion", value: "Kidney transplant workup", note: "Workup pathway not consistently ordering renal panels." },
            { label: "Lowest pharmacy conversion", value: "Nephrology OPD", note: "ESA and CKD medication leakage likely." },
            { label: "Open report", value: "Service Conversion", note: "Use Reports for founder-format export." },
          ])}
        </div>
        ${v2DriverBoard("Conversion by Service Line", "Service-line lab and pharmacy conversion rate.", [
          { name: "Nephrology OPD", value: 72, display: "72%", note: "Lab 29% · Pharmacy 43%" },
          { name: "In-centre dialysis", value: 68, display: "68%", note: "Lab 31% · Pharmacy 37%" },
          { name: "Renal ICU", value: 52, display: "52%", note: "Lab 24% · Pharmacy 28%", status: "Watch" },
          { name: "Kidney transplant workup", value: 46, display: "46%", note: "Lab 18% · Pharmacy 28%", status: "High" },
        ])}
        ${v2Table(["Service Line", "OPD Visits", "Lab Orders", "Drug Orders", "Lab Conversion %", "Pharmacy Conversion %", "Revenue Impact", "Status"], [
          ["Nephrology OPD", "6,420", "1,860", "2,780", "29%", "43%", "₹82L", "Low"],
          ["In-centre dialysis", "3,240", "1,010", "1,200", "31%", "37%", "₹64L", "Low"],
          ["Renal ICU", "2,820", "680", "790", "24%", "28%", "₹41L", "Watch"],
          ["Kidney transplant workup", "3,180", "570", "890", "18%", "28%", "₹38L", "High"],
        ], "Service Conversion Table")}
      `;
    }

    return v2DrilldownBoard();
  }

  function renderCapacityWorkspace(tab) {
    if (zyephrDerived) return renderDerivedCapacityWorkspace(tab);
    if (tab === "occupancy") {
      return `
        <section class="v2-capacity-page v2-capacity-page--occupancy">
          <div class="v2-capacity-hero">
            <div><span>Pressure now</span><strong>2 branches above operating threshold</strong><em>Central and Riverside need same-day bed release action.</em></div>
            <div><span>Open beds</span><strong>126</strong><em>34 can be used without transfer approval.</em></div>
            <div><span>Release target</span><strong>31</strong><em>Before 6 PM to protect evening admissions.</em></div>
          </div>
          <div class="v2-bed-control-layout">
            <article class="v2-panel v2-bed-board">
              <div class="v2-panel-heading">
                <div><span>Bed Control Board</span><strong>Occupancy, blocked beds, and release readiness in one operating view.</strong></div>
              </div>
              <div class="v2-bed-rows">
                ${[
                  ["Riverside", 90.2, 9, 6, "ICU blocked", "Escalate ICU release", "High"],
                  ["Central", 88.8, 12, 5, "Billing release", "Clear billing queue", "High"],
                  ["Westside", 86.5, 18, 1, "Tight but stable", "Hold elective spillover", "Watch"],
                  ["Eastview", 84.1, 24, 0, "Transfer buffer", "Use as buffer", "Low"],
                  ["Northgate", 82.3, 21, 2, "Procedure recovery", "Monitor recovery", "Medium"],
                ]
                  .map(([branch, occupancy, openBeds, blocked, blocker, decision, status]) => `
                    <button type="button" class="v2-bed-row v2-bed-row--${v2StatusTone(status)}" data-v2-drawer="${escapeHtml(branch)}" data-v2-kind="Bed control" data-v2-status="${escapeHtml(status)}">
                      <span><strong>${escapeHtml(branch)}</strong><em>${escapeHtml(blocker)}</em></span>
                      <i style="--bed-fill:${occupancy}%"><b></b><u></u></i>
                      <strong>${occupancy}%</strong>
                      <em>${openBeds} open · ${blocked} blocked</em>
                      <small>${escapeHtml(decision)}</small>
                    </button>
                  `)
                  .join("")}
              </div>
            </article>
            <aside class="v2-panel v2-release-stack">
              <div class="v2-panel-heading"><div><span>Release Queue</span><strong>Actions that turn pressure into beds.</strong></div></div>
              ${[
                ["Billing", "18 discharge bills waiting", "Central owns 9; Riverside owns 6.", "High"],
                ["ICU", "2 blocked ICU beds", "Riverside needs infection-control sign-off.", "High"],
                ["Pharmacy", "7 medication closures", "Final issue and return delays.", "Watch"],
              ]
                .map(([label, title, detail, status]) => `
                  <button type="button" class="v2-release-item" data-v2-drawer="${escapeHtml(title)}" data-v2-kind="Release queue" data-v2-status="${escapeHtml(status)}">
                    <span>${escapeHtml(label)}</span><strong>${escapeHtml(title)}</strong><em>${escapeHtml(detail)}</em>${v2Pill(status)}
                  </button>
                `)
                .join("")}
            </aside>
          </div>
        </section>
      `;
    }

    if (tab === "alos") {
      return `
        <section class="v2-capacity-page v2-capacity-page--alos">
          <div class="v2-capacity-hero">
            <div><span>ALOS</span><strong>4.1d</strong><em>Improving, but 37 long-stay cases remain.</em></div>
            <div><span>Top delay stage</span><strong>Billing</strong><em>18 cases are keeping beds occupied.</em></div>
            <div><span>Longest branch</span><strong>Riverside</strong><em>5.0d, mostly ICU readiness.</em></div>
          </div>
          <article class="v2-panel v2-alos-path">
            <div class="v2-panel-heading"><div><span>Stay-Length Delay Path</span><strong>Each stage shows how many long-stay cases it is holding.</strong></div></div>
            <div class="v2-alos-stages">
              ${[
                ["Clinical readiness", "9 cases", "Medical directors", "Watch"],
                ["Diagnostics report", "7 cases", "Diagnostics", "Watch"],
                ["Billing clearance", "18 cases", "Revenue cycle", "High"],
                ["Family / transport", "3 cases", "Care coordinators", "Low"],
              ]
                .map(([stage, count, owner, status]) => `
                  <button type="button" class="v2-alos-stage v2-alos-stage--${v2StatusTone(status)}" data-v2-drawer="${escapeHtml(stage)}" data-v2-kind="ALOS stage" data-v2-status="${escapeHtml(status)}">
                    <span>${escapeHtml(stage)}</span><strong>${escapeHtml(count)}</strong><em>${escapeHtml(owner)}</em>${v2Pill(status)}
                  </button>
                `)
                .join("")}
            </div>
          </article>
          ${v2WorkflowTable("Branch Stay-Length Review", "Branch, department driver, and owner for the next review.", ["Branch", "ALOS", "Driver", "Cases", "Owner", "Status"], [
            [{ value: "Riverside", note: "Highest ALOS" }, "5.0d", "ICU readiness", "11", "Medical director", { value: "Review today", status: "High" }],
            [{ value: "Central", note: "Billing drag" }, "4.5d", "Billing closure", "9", "Revenue cycle", { value: "Owner needed", status: "High" }],
            [{ value: "Northgate", note: "Procedure recovery" }, "4.3d", "Recovery wait", "6", "OT manager", { value: "Watch", status: "Medium" }],
            [{ value: "Westside", note: "Benchmark" }, "4.2d", "Normal", "3", "Branch lead", { value: "Stable", status: "Low" }],
          ])}
        </section>
      `;
    }

    if (tab === "admissions-discharges") {
      return `
        <section class="v2-capacity-page v2-capacity-page--flow">
          <div class="v2-flow-command">
            <article class="v2-panel v2-flow-balance">
              <span>Net bed load</span>
              <strong>+23</strong>
              <p>Admissions are running ahead of confirmed discharges; release plan needed before evening demand.</p>
              <div>
                <i style="--flow-a:53%"><b>412 admissions</b></i>
                <i style="--flow-a:47%"><b>389 discharges</b></i>
              </div>
            </article>
            <article class="v2-panel v2-flow-stages">
              <div class="v2-panel-heading"><div><span>Today Flow Stages</span><strong>Operating stages for the next bed huddle.</strong></div></div>
              ${[
                ["Expected admissions", "126", "Front office", "Watch"],
                ["Confirmed discharges", "84", "Ward teams", "Low"],
                ["Release blocked", "31", "Ops huddle", "High"],
                ["Transfer candidates", "9", "Bed desk", "Watch"],
              ]
                .map(([stage, count, owner, status]) => `
                  <button type="button" class="v2-flow-stage v2-flow-stage--${v2StatusTone(status)}" data-v2-drawer="${escapeHtml(stage)}" data-v2-kind="Flow stage" data-v2-status="${escapeHtml(status)}">
                    <span>${escapeHtml(stage)}</span><strong>${escapeHtml(count)}</strong><em>${escapeHtml(owner)}</em>
                  </button>
                `)
                .join("")}
            </article>
          </div>
          ${v2WorkflowTable("Admission / Discharge Control", "Where inflow is outpacing discharge readiness.", ["Branch", "Admissions", "Discharges", "Net beds", "Blocker", "Decision"], [
            [{ value: "Westside", note: "Stable" }, "86", "82", "+4", "None", { value: "Normal ops", status: "Low" }],
            [{ value: "Central", note: "Release lag" }, "71", "54", "+17", "Billing handoff", { value: "Escalate billing", status: "High" }],
            [{ value: "Riverside", note: "ICU + pharmacy" }, "62", "48", "+14", "Pharmacy closure", { value: "Shift bed plan", status: "High" }],
            [{ value: "Northgate", note: "Watch" }, "68", "65", "+3", "Procedure recovery", { value: "Monitor", status: "Medium" }],
          ])}
          <div class="v2-huddle-lane">
            ${[
              ["Central", "Convert 9 billing holds into releases", "Revenue cycle owner to close approvals before 4 PM.", "High"],
              ["Riverside", "Move low-acuity admissions to Eastview", "Eastview has buffer capacity and no blocked beds.", "Watch"],
              ["Northgate", "Procedure recovery wait", "Keep recovery clear for afternoon procedure list.", "Watch"],
            ]
              .map(([branch, title, detail, status]) => `
                <button type="button" class="v2-huddle-card" data-v2-drawer="${escapeHtml(title)}" data-v2-kind="Huddle decision" data-v2-status="${escapeHtml(status)}">
                  <span>${escapeHtml(branch)}</span><strong>${escapeHtml(title)}</strong><em>${escapeHtml(detail)}</em>${v2Pill(status)}
                </button>
              `)
              .join("")}
          </div>
        </section>
      `;
    }

    return `
      <section class="v2-capacity-page v2-capacity-page--delays">
        <div class="v2-delay-summary">
          <div><span>Delay cases</span><strong>74</strong><em>+9 vs previous period</em></div>
          <div><span>Top driver</span><strong>Billing</strong><em>18 cases, 9.4h average delay</em></div>
          <div><span>Owner gaps</span><strong>6</strong><em>Assignments needed before huddle.</em></div>
        </div>
        <article class="v2-panel v2-delay-kanban">
          <div class="v2-panel-heading"><div><span>Delay Owner Board</span><strong>Grouped by the team that can remove the delay.</strong></div></div>
          <div class="v2-delay-columns">
            ${[
              ["Revenue cycle", [["Billing", "18 cases", "Close approvals", "High"], ["TPA query batch", "7 cases", "Resolve payer questions", "High"]]],
              ["Pharmacy", [["Medication return", "13 cases", "Clear returns", "Watch"], ["Final issue", "6 cases", "Release packets", "Watch"]]],
              ["Diagnostics", [["Final report", "11 cases", "Prioritize reports", "Watch"], ["Result sign-off", "4 cases", "Clinical review", "Medium"]]],
              ["Ward teams", [["Handoff checklist", "9 cases", "Assign floor owner", "Medium"], ["Family readiness", "3 cases", "Care coordination", "Low"]]],
            ]
              .map(([owner, cards]) => `
                <section class="v2-delay-column">
                  <h3>${escapeHtml(owner)}</h3>
                  ${cards
                    .map(([title, count, action, status]) => `
                      <button type="button" class="v2-delay-card" data-v2-drawer="${escapeHtml(title)}" data-v2-kind="Delay contributor" data-v2-status="${escapeHtml(status)}">
                        <span>${escapeHtml(count)}</span><strong>${escapeHtml(title)}</strong><em>${escapeHtml(action)}</em>${v2Pill(status)}
                      </button>
                    `)
                    .join("")}
                </section>
              `)
              .join("")}
          </div>
        </article>
      </section>
    `;
  }

  function renderOperationsWorkspace(tab) {
    if (zyephrDerived) return renderDerivedOperationsWorkspace(tab);
    if (tab === "patient-flow") {
      return `
        ${v2MetricCards([
          { label: "OPD Load", value: "4,870", delta: "+8%" },
          { label: "IPD Admissions", value: "412", delta: "+5.1%" },
          { label: "Avg Wait", value: "22m", delta: "Watch" },
          { label: "Queue Pressure", value: "3 units", delta: "High" },
        ])}
        <div class="v2-board-grid">
          ${v2LaneBoard("Patient Flow / OPD + IPD", "OPD volume, admissions, and queue pressure by branch/clinic.", [
            { name: "OPD Clinics", value: 1280, note: "22m avg wait · 4 overloaded desks", status: "Watch" },
            { name: "Ward A", value: 720, note: "38 admissions · 91% occupancy", status: "High" },
            { name: "ICU", value: 410, note: "17 admits · 2 blocked beds", status: "High" },
            { name: "Procedure Recovery", value: 560, note: "42 cases · 7 delayed", status: "Medium" },
          ])}
          ${v2CompactMetricRail([
            { label: "OPD focus", value: "Central", note: "Highest wait time and queue pressure." },
            { label: "IPD focus", value: "Ward A", note: "Admissions outpacing discharges." },
          ])}
        </div>
        ${v2Table(["Branch / Clinic", "OPD Load", "Avg Wait", "Queue Pressure", "Owner", "Status"], v2RowsFor("COO", "/operations", tab), "OPD Load Table")}
      `;
    }

    if (tab === "discharge-flow") {
      return `
        ${v2MetricCards([
          { label: "Pending Discharges", value: "48", delta: "+7" },
          { label: "Median TAT", value: "5.8h", delta: "+0.6h" },
          { label: "Billing Stage", value: "18 cases", delta: "Top blocker" },
          { label: "At Risk", value: "11", delta: "High" },
        ])}
        <div class="v2-board-grid v2-board-grid--queue">
          ${v2FunnelBoard("Discharge TAT by Stage", "Doctor order to bed release bottleneck.", [
            { name: "Doctor Order", value: 48, display: "48" },
            { name: "Billing", value: 18, display: "18", status: "High" },
            { name: "Pharmacy", value: 12, display: "12", status: "Watch" },
            { name: "Nursing", value: 9, display: "9" },
            { name: "Bed Release", value: 7, display: "7" },
          ])}
          ${v2CompactMetricRail([
            { label: "Billing handoff", value: "18 cases", note: "Routes to Revenue Cycle Ops / Discharge Billing." },
            { label: "Next owner", value: "Floor coordinators", note: "Close stage handoff before 4 PM." },
          ])}
        </div>
        ${v2Table(["Ward", "Case ID", "Pending Since", "Current Stage", "Main Blocker", "Owner", "Status"], [
          ["Ward A", "DC-1042", "5h 20m", "Billing", "Insurance approval", "Anika", "High"],
          ["ICU", "DC-1037", "4h 40m", "Pharmacy", "Medication return", "Farah", "Watch"],
          ["Ward B", "DC-1028", "3h 10m", "Nursing", "Final summary", "Ravi", "Medium"],
        ], "Pending Discharge Queue")}
      `;
    }

    if (tab === "bed-capacity") {
      return `
        ${v2MetricCards([
          { label: "Network Occupancy", value: "84.2%", delta: "-1.2pp" },
          { label: "Blocked Beds", value: "14", delta: "ICU + isolation" },
          { label: "Release Queue", value: "31", delta: "Billing + pharmacy" },
          { label: "Pressure", value: "2 branches", delta: "Central · Riverside" },
        ])}
        <div class="v2-board-grid">
          ${v2PressureBoard("Bed Pressure by Branch", "Occupancy plus blocked-bed signal against the 85% threshold.", v2Branches.map((branch) => ({
            name: branch.name,
            value: branch.occupancy + (branch.risk === "High" ? 5 : branch.risk === "Medium" ? 2 : 0),
            display: `${branch.occupancy}%`,
            note: `${branch.alos}d ALOS · ${branch.risk === "High" ? "blocked beds" : "normal release"}`,
            status: branch.risk,
          })), { max: 96, target: 85, unit: "%" })}
          ${v2CompactMetricRail([
            { label: "Blocked Bed Focus", value: "ICU", note: "Riverside has two blocked ICU beds." },
            { label: "Release Action", value: "Billing", note: "Close 18 billing-stage discharges." },
          ])}
        </div>
        ${v2Table(["Branch", "Occupancy", "Blocked Beds", "Expected Discharges", "Release Blocker", "Owner", "Status"], [
          ["Central", "88.8%", "5", "14", "Billing", "Ravi", "High"],
          ["Riverside", "90.2%", "6", "11", "Pharmacy", "Nisha", "High"],
          ["Westside", "86.5%", "1", "8", "None", "Maya", "Low"],
        ], "Bed Capacity Queue")}
      `;
    }

    if (tab === "staffing") {
      return `
        ${v2MetricCards([
          { label: "Coverage", value: "89%", delta: "-3pp" },
          { label: "Night Gap", value: "11 shifts", delta: "High" },
          { label: "Agency Need", value: "6 slots", delta: "This week" },
          { label: "Risk", value: "Watch", delta: "Central · Riverside" },
        ])}
        <div class="v2-board-grid">
          ${v2ShiftGridBoard("Staffing Coverage by Shift", "Coverage by unit and shift; low cells are the staffing decisions.", [
            { branch: "ICU", values: [92, 89, 80, 68] },
            { branch: "Ward A", values: [95, 91, 84, 74] },
            { branch: "Dialysis", values: [88, 82, 76, 70] },
            { branch: "Procedure", values: [94, 86, 78, 72] },
          ])}
          ${v2CompactMetricRail([
            { label: "Main Gap", value: "Night ICU", note: "Two branches below safe coverage." },
            { label: "Next Action", value: "Float pool", note: "Move Westside cover into Riverside night." },
          ])}
        </div>
        ${v2Table(["Unit", "Shift", "Required", "Covered", "Gap", "Owner", "Status"], [
          ["ICU", "Night", "18", "12", "6", "Nisha", "High"],
          ["Ward A", "Night", "22", "17", "5", "Ravi", "Watch"],
          ["Dialysis", "Evening", "16", "12", "4", "Dialysis lead", "Watch"],
        ], "Staffing Gap Queue")}
      `;
    }

    if (tab === "procedures") {
      return `
        ${v2MetricCards([
          { label: "Scheduled", value: "74", delta: "Today" },
          { label: "Completed", value: "61", delta: "82%" },
          { label: "Delayed", value: "13", delta: "Watch" },
          { label: "Utilization", value: "78%", delta: "-4pp" },
        ])}
        <div class="v2-board-grid">
          ${v2DriverBoard("Scheduled vs Completed Procedures", "OT/procedure execution by room.", [
            { name: "Procedure Room 1", value: 94, display: "94%", note: "Vascular access" },
            { name: "Procedure Room 2", value: 82, display: "82%", note: "Transplant workup" },
            { name: "Procedure Room", value: 74, display: "74%", note: "Dialysis access", status: "Watch" },
            { name: "Recovery", value: 68, display: "68%", note: "Bed release lag", status: "High" },
          ])}
          ${v2CompactMetricRail([
            { label: "Main Delay", value: "Room prep", note: "5 cases delayed." },
            { label: "Billing Clearance", value: "3 cases", note: "Relevant for procedure start." },
          ])}
        </div>
        ${v2Table(["OT / Unit", "Scheduled Cases", "Completed Cases", "Utilization", "Delayed Cases", "Main Delay", "Status"], [
          ["OT 1", "18", "17", "94%", "1", "Anesthesia", "Low"],
          ["OT 2", "22", "18", "82%", "4", "Surgeon availability", "Watch"],
          ["Procedure Room", "19", "14", "74%", "5", "Equipment", "High"],
        ], "Procedure Snapshot")}
      `;
    }

    return `${v2MetricCards(v2Spec("COO", "/operations", tab).metrics)}${v2MatrixBoard(v2Spec("COO", "/operations", tab), "COO", "/operations", tab)}`;
  }

  function renderDialysisWorkspace(role, tab) {
    if (zyephrDerived) return renderDerivedDialysisWorkspace(role, tab);
    const spec = v2Spec(role, "/dialysis-program", tab);
    if (tab === "utilization") {
      return `
        ${v2MetricCards([
          { label: "Utilization", value: "86%", delta: "+2pp" },
          { label: "Open Capacity", value: "118 slots", delta: "Evening + night" },
          { label: "Rebalance Need", value: "27 sessions", delta: "Central · Riverside" },
          { label: "Machine Holds", value: "2", delta: "Riverside" },
        ])}
        <div class="v2-workspace-split">
          ${v2ShiftGridBoard("Shift Slot Map", "Branch-shift coverage for reallocating dialysis sessions.", [
            { branch: "Westside", values: [96, 93, 88, 82] },
            { branch: "Eastview", values: [94, 90, 84, 79] },
            { branch: "Northgate", values: [91, 86, 82, 76] },
            { branch: "Central", values: [88, 82, 74, 69] },
            { branch: "Riverside", values: [84, 78, 66, 61] },
          ])}
          ${v2ActionQueue("Rebalance Actions", "Actions that convert capacity into completed sessions.", [
            { label: "Move", title: "18 sessions to Westside evening", detail: "Westside has usable evening capacity without a staffing gap.", status: "Low" },
            { label: "Repair", title: "Riverside machine hold", detail: "Two machines block 12 session slots across evening and night.", status: "High" },
            { label: "Cover", title: "Central night staffing", detail: "Float pool needed for 9 night sessions this week.", status: "Watch" },
          ])}
        </div>
        ${v2WorkflowTable("Branch Session Plan", "Capacity, demand, and concrete reallocation decision.", ["Branch", "Weekly demand", "Booked", "Open slots", "Constraint", "Decision"], [
          [{ value: "Westside", note: "Best buffer" }, "186", "168", "18", "None", { value: "Receive overflow", status: "Low" }],
          [{ value: "Eastview", note: "Moderate buffer" }, "164", "152", "12", "Evening cover", { value: "Hold reserve", status: "Watch" }],
          [{ value: "Central", note: "Staffing gap" }, "142", "136", "6", "Night staff", { value: "Add float cover", status: "High" }],
          [{ value: "Riverside", note: "Machine hold" }, "128", "119", "9", "2 machines", { value: "Repair / transfer", status: "High" }],
        ])}
      `;
    }

    if (/sessions|missed-sessions/i.test(tab)) {
      return `
        ${v2MetricCards([
          { label: "Scheduled Sessions", value: "842", delta: "+4%" },
          { label: "Completed", value: "798", delta: "94.8%" },
          { label: "Missed / Shortened", value: "44", delta: "Watch" },
          { label: "Utilization", value: "86%", delta: "+2pp" },
        ])}
        <div class="v2-workspace-split">
          ${v2WorkflowTable(tab === "missed-sessions" ? "Missed / Shortened Session Queue" : "Scheduled vs Completed Sessions", "Reason, branch, owner, and recovery plan.", ["Branch", "Scheduled", "Completed", "Missed", "Shortened", "Recovery action"], [
            [{ value: "Westside", note: "Stable" }, "186", "178", "3", "5", { value: "Normal follow-up", status: "Low" }],
            [{ value: "Eastview", note: "On plan" }, "164", "156", "4", "4", { value: "Monitor", status: "Low" }],
            [{ value: "Central", note: "No-show pressure" }, "142", "130", "7", "5", { value: "Patient outreach", status: "High" }],
            [{ value: "Riverside", note: "Machine + transport" }, "128", "112", "11", "5", { value: "Repair and reschedule", status: "High" }],
          ])}
          ${v2ActionQueue("Exception Recovery", "The queue that turns missed treatment into recovered treatment.", [
            { label: "No-show", title: "13 missed sessions", detail: "Call back, confirm medical priority, and place into open Westside/Eastview slots.", status: "High" },
            { label: "Shortened", title: "31 shortened sessions", detail: "Late starts and transport delays causing treatment duration loss.", status: "Watch" },
            { label: "Machine", title: "5 machine-affected sessions", detail: "Riverside repair ETA required before reschedule plan is safe.", status: "High" },
          ])}
        </div>
        ${v2ShiftGridBoard("Recovery Slot Map", "Open slots available for missed-session recovery.", [
          { branch: "Westside", values: [96, 93, 88, 82] },
          { branch: "Eastview", values: [94, 90, 84, 79] },
          { branch: "Central", values: [88, 82, 74, 69] },
          { branch: "Riverside", values: [84, 78, 66, 61] },
        ])}
      `;
    }

    if (tab === "machines") {
      return `
        ${v2MetricCards([
          { label: "Available", value: "48", delta: "72%" },
          { label: "In Use", value: "32", delta: "Live" },
          { label: "Maintenance", value: "5", delta: "Watch" },
          { label: "Down", value: "2", delta: "High" },
        ])}
        <div class="v2-workspace-split">
          ${v2WorkflowTable("Machine Bay Board", "Machine state, impacted sessions, and repair decision.", ["Machine", "Branch", "State", "Sessions affected", "Owner", "Action"], [
            [{ value: "M-204", note: "Pump fault" }, "Riverside", "Down", "5", "Biomedical", { value: "Repair ETA", status: "High" }],
            [{ value: "M-118", note: "Preventive service" }, "Central", "Maintenance", "2", "Biomedical", { value: "Release by 3 PM", status: "Watch" }],
            [{ value: "M-087", note: "Active" }, "Westside", "In use", "0", "Unit lead", { value: "Normal", status: "Low" }],
            [{ value: "M-132", note: "Spare" }, "Eastview", "Available", "0", "Unit lead", { value: "Use for overflow", status: "Low" }],
          ])}
          ${v2ActionQueue("Repair / Transfer Queue", "Machine actions connected to sessions that must be protected.", [
            { label: "Repair", title: "Riverside M-204", detail: "Confirm repair ETA before moving evening patients.", status: "High" },
            { label: "Transfer", title: "5 sessions need alternate slot", detail: "Prefer Eastview afternoon or Westside evening based on patient travel.", status: "Watch" },
            { label: "Reserve", title: "Eastview spare machine", detail: "Keep available until Riverside status is confirmed.", status: "Low" },
          ])}
        </div>
      `;
    }

    if (tab === "exceptions") {
      return `
        ${v2MetricCards([
          { label: "Open Exceptions", value: "44", delta: "13 missed · 31 shortened" },
          { label: "High Risk", value: "Riverside", delta: "Machine + no-show" },
          { label: "Owner Gaps", value: "6", delta: "Need huddle" },
          { label: "Closure Target", value: "24h", delta: "Operational" },
        ])}
        <div class="v2-workspace-split">
          ${v2WorkflowTable("Exception Closure Queue", "Exception type, branch concentration, owner, and closure plan.", ["Exception", "Branch", "Sessions", "Cause", "Owner", "Closure plan"], [
            [{ value: "DX-128", note: "Machine hold" }, "Riverside", "5", "Pump fault", "Dialysis lead", { value: "Repair ETA", status: "High" }],
            [{ value: "DX-119", note: "No-show" }, "Central", "7", "Patient no-show", "Branch manager", { value: "Outreach", status: "High" }],
            [{ value: "DX-104", note: "Late start" }, "Eastview", "6", "Transport delay", "Shift lead", { value: "Transport check", status: "Watch" }],
            [{ value: "DX-097", note: "Shortened" }, "Westside", "4", "Clinical tolerance", "Clinical lead", { value: "Review notes", status: "Watch" }],
          ])}
          ${v2ActionQueue("Huddle Order", "Which exception should be handled first.", [
            { label: "First", title: "Protect missed treatments", detail: "Missed sessions have higher clinical risk than shortened sessions.", status: "High" },
            { label: "Second", title: "Free Riverside machines", detail: "Repair decision controls the reschedule plan.", status: "High" },
            { label: "Third", title: "Close late-start pattern", detail: "Transport and clinic handoff need a recurring fix.", status: "Watch" },
          ])}
        </div>
      `;
    }

    if (tab === "business-contribution") {
      return `
        ${v2MetricCards([
          { label: "Dialysis Revenue", value: "₹5.7Cr", delta: "+4.1%" },
          { label: "Sessions", value: "842", delta: "+4%" },
          { label: "Revenue / Session", value: "₹6,770", delta: "+1.3%" },
          { label: "Contribution", value: "13%", delta: "Network revenue" },
        ])}
        <div class="v2-workspace-split">
          ${v2WorkflowTable("Dialysis Contribution Ledger", "Branch contribution with utilization and protected upside.", ["Branch", "Sessions", "Utilization", "Revenue", "Open upside", "Decision"], [
            [{ value: "Westside", note: "Highest yield" }, "186", "91%", "₹1.4Cr", "₹14L", { value: "Protect capacity", status: "Low" }],
            [{ value: "Eastview", note: "Overflow buffer" }, "164", "88%", "₹1.1Cr", "₹11L", { value: "Use spare slots", status: "Low" }],
            [{ value: "Central", note: "Staffing gap" }, "142", "73%", "₹0.8Cr", "₹19L", { value: "Fix night cover", status: "High" }],
            [{ value: "Riverside", note: "Machine hold" }, "128", "69%", "₹0.7Cr", "₹32L", { value: "Repair first", status: "High" }],
          ])}
          ${v2FlowStageBoard("Contribution Levers", "Where incremental contribution can actually be unlocked.", [
            { name: "Open evening slots", count: 32, display: "₹32L", owner: "Branch ops", status: "Low" },
            { name: "Machine downtime", count: 24, display: "₹24L", owner: "Biomedical", status: "High" },
            { name: "Missed sessions", count: 18, display: "₹18L", owner: "Dialysis lead", status: "High" },
            { name: "Staffing gap", count: 14, display: "₹14L", owner: "Nursing", status: "Watch" },
          ])}
        </div>
      `;
    }

    return `${v2MetricCards(spec.metrics)}${v2MatrixBoard(spec, role, "/dialysis-program", tab)}`;
  }

  function renderRevenueCycleWorkspace(tab) {
    if (zyephrDerived) return renderDerivedRevenueCycleWorkspace(tab);
    if (tab === "billing-queue" || tab === "discharge-billing") {
      const discharge = tab === "discharge-billing";
      return `
        ${v2MetricCards([
          { label: discharge ? "Discharge Billing" : "Billing Queue", value: discharge ? "18 cases" : "86 cases", delta: "Open" },
          { label: "High Aging", value: "24", delta: "Watch" },
          { label: "Pending Amount", value: "₹2.8Cr", delta: "Operational cash drag" },
          { label: "Owner Gap", value: "7 cases", delta: "Needs assignment" },
        ])}
        <div class="v2-board-grid v2-board-grid--queue">
          ${v2BranchDecisionBoard(discharge ? "Discharge Billing Board" : "Billing Closure Board", "Cases grouped by blocker, owner, and next action.", [
            { branch: "Insurance approval", primary: "18 cases", detail: "Payer response and approval documents pending.", status: "High" },
            { branch: "Missing discharge summary", primary: "14 cases", detail: "Ward handoff not complete.", status: "High" },
            { branch: "Pharmacy closure", primary: "12 cases", detail: "Medication returns and final issue pending.", status: "Watch" },
            { branch: "Patient payment", primary: "9 cases", detail: "Cash desk closure needed before release.", status: "Watch" },
          ])}
          ${v2CompactMetricRail([
            { label: "Today first", value: "18 discharge cases", note: "Clear before evening bed release." },
            { label: "Owner sweep", value: "7 unassigned", note: "Assign before next huddle." },
          ])}
        </div>
        ${v2Table(["Case ID", "Branch", "Payer", "Amount", "Stage", "Blocker", "Owner", "Status"], [
          ["RC-1042", "Central", "Insurance", "₹42L", "Discharge billing", "Approval query", "Anika", "High"],
          ["RC-1037", "Riverside", "TPA", "₹38L", "Final bill", "Missing discharge summary", "Farah", "High"],
          ["RC-1028", "Northgate", "Corporate", "₹26L", "Claim prep", "Policy mismatch", "Dev", "Watch"],
          ["RC-1019", "Westside", "Cash", "₹11L", "Patient payment", "Cash desk", "Sara", "Low"],
        ], discharge ? "Discharge Billing Queue" : "Billing Queue")}
      `;
    }

    if (tab === "claims-aging") {
      return `
        ${v2MetricCards([
          { label: "Claims Pending", value: "284", delta: "+18" },
          { label: "Pending Amount", value: "₹4.9Cr", delta: "Medium" },
          { label: "90+ Claims", value: "32", delta: "High" },
          { label: "Owner Gaps", value: "7", delta: "Watch" },
        ])}
        <div class="v2-board-grid">
          ${v2BucketBoard("Claims Aging by Payer and Branch", ["0-30", "31-60", "61-90", "90+"], [
            { name: "Insurance", values: [38, 24, 18, 14] },
            { name: "TPA", values: [31, 29, 21, 19] },
            { name: "Corporate", values: [22, 16, 9, 5] },
            { name: "Government", values: [18, 17, 15, 12] },
          ])}
          ${v2CompactMetricRail([{ label: "Top Payer Risk", value: "TPA", note: "90+ bucket needs query closure." }])}
        </div>
        ${v2Table(["Payer", "Branch", "Claim Count", "Pending Amount", "Aging Bucket", "Owner", "Status"], [
          ["TPA", "Riverside", "22", "₹58L", "90+", "Farah", "High"],
          ["Insurance", "Central", "18", "₹42L", "61-90", "Anika", "Watch"],
          ["Corporate", "Westside", "11", "₹24L", "31-60", "Dev", "Medium"],
        ], "Claims Aging Table")}
      `;
    }

    if (tab === "missing-documents") {
      return `
        ${v2MetricCards([
          { label: "Missing Docs", value: "64", delta: "+11" },
          { label: "Discharge Impact", value: "14 cases", delta: "High" },
          { label: "Avg Aging", value: "2.8d", delta: "Watch" },
          { label: "Owner", value: "Billing ops", delta: "Queue" },
        ])}
        <div class="v2-board-grid">
          ${v2TileGrid("Missing Document Board", "Checklist board by document type.", [
            { label: "Document", title: "Discharge Summary", value: "18", note: "Highest blocker.", status: "High" },
            { label: "Document", title: "Insurance Form", value: "14", note: "TPA dependency.", status: "Watch" },
            { label: "Document", title: "Approval Letter", value: "11", note: "Corporate payer." },
            { label: "Document", title: "Investigation Reports", value: "9", note: "Lab handoff." },
          ])}
          ${v2CompactMetricRail([{ label: "Next Action", value: "Owner sweep", note: "Close high-aging discharge summaries first." }])}
        </div>
        ${v2Table(["Case ID", "Branch", "Document Missing", "Owner", "Aging", "Next Action", "Status"], [
          ["RC-1037", "Riverside", "Discharge Summary", "Farah", "4d", "Collect from ward", "High"],
          ["RC-1042", "Central", "Insurance Form", "Anika", "3d", "Payer follow-up", "Watch"],
          ["RC-1028", "Northgate", "Approval Letter", "Dev", "2d", "Corporate desk", "Medium"],
        ], "Missing Document Queue")}
      `;
    }

    if (tab === "payer-blockers") {
      return `
        ${v2MetricCards([
          { label: "Open Blockers", value: "86", delta: "Medium" },
          { label: "Top Blocker", value: "TPA Query", delta: "31 cases" },
          { label: "Pending Amount", value: "₹2.8Cr", delta: "Watch" },
          { label: "Avg Aging", value: "8.2d", delta: "+1.1d" },
        ])}
        <div class="v2-board-grid">
          ${v2DriverBoard("Payer Blocker Mix", "Operational blocker categories.", [
            { name: "TPA Query", value: 31, display: "31", note: "Missing clarification", status: "High" },
            { name: "Insurance Approval", value: 24, display: "24", note: "Approval pending" },
            { name: "Document Mismatch", value: 16, display: "16", note: "Policy mismatch" },
            { name: "Patient Payment", value: 11, display: "11", note: "Cash desk" },
          ])}
          ${v2CompactMetricRail([{ label: "Owner", value: "RC Ops", note: "Daily closure queue." }])}
        </div>
        ${v2Table(["Payer", "Blocker Type", "Case Count", "Pending Amount", "Avg Aging", "Owner", "Status"], [
          ["TPA", "Query", "31", "₹1.1Cr", "11d", "Farah", "High"],
          ["Insurance", "Approval", "24", "₹0.9Cr", "8d", "Anika", "Watch"],
          ["Corporate", "Document mismatch", "16", "₹0.5Cr", "6d", "Dev", "Medium"],
        ], "Payer Blocker Table")}
      `;
    }

    return `${v2MetricCards(v2Spec("COO", "/revenue-cycle-ops", tab).metrics)}${v2QueueBoard(v2Spec("COO", "/revenue-cycle-ops", tab), "COO", "/revenue-cycle-ops", tab)}`;
  }

  function renderBranchesWorkspace(role, tab) {
    if (zyephrDerived) return renderDerivedBranchesWorkspace(role, tab);
    if (tab === "service-performance") {
      const isCoo = role === "COO";
      const serviceRows = [
        { service: "OPD", demand: 1280, conversion: 72, bottleneck: "Front desk wait", branch: "Westside", owner: "Branch ops", status: "Low" },
        { service: "Dialysis", demand: 842, conversion: 86, bottleneck: "Evening slot gap", branch: "Riverside", owner: "Dialysis lead", status: "High" },
        { service: "Vascular access", demand: 412, conversion: 64, bottleneck: "Recovery bed release", branch: "Central", owner: "Procedure lead", status: "Watch" },
        { service: "Renal diagnostics", demand: 668, conversion: 58, bottleneck: "Report sign-off", branch: "Northgate", owner: "Renal diagnostics", status: "Watch" },
        { service: "Pharmacy", demand: 886, conversion: 61, bottleneck: "External leakage", branch: "Eastview", owner: "Pharmacy", status: "Medium" },
      ];
      return `
        <section class="v2-branch-service-page">
          <div class="v2-service-command">
            <article class="v2-service-command-card">
              <span>${isCoo ? "Operating lens" : "Service lens"}</span>
              <strong>${isCoo ? "Where demand is turning into completed service" : "Where service demand needs branch action"}</strong>
              <p>${isCoo ? "COO view stays operational: demand, conversion, bottleneck, owner." : "CEO view stays at branch/service level; detailed revenue analysis remains in Finance."}</p>
            </article>
            <article class="v2-service-command-card">
              <span>Primary drag</span>
              <strong>Dialysis evening slots</strong>
              <p>Riverside is creating the largest service bottleneck this period.</p>
            </article>
            <article class="v2-service-command-card">
              <span>Next decision</span>
              <strong>Move 18 sessions</strong>
              <p>Shift overflow to Westside evening and Eastview afternoon capacity.</p>
            </article>
          </div>
          <div class="v2-service-layout">
            <article class="v2-panel v2-service-map">
              <div class="v2-panel-heading">
                <div><span>Service Performance Map</span><strong>Demand, conversion, and branch bottleneck by service line.</strong></div>
              </div>
              <div class="v2-service-map-head">
                <span>Service</span><span>Demand</span><span>Conversion</span><span>Branch focus</span><span>Decision</span>
              </div>
              ${serviceRows
                .map((row) => `
                  <button type="button" class="v2-service-row v2-service-row--${v2StatusTone(row.status)}" data-v2-drawer="${escapeHtml(row.service)}" data-v2-kind="Service performance" data-v2-status="${escapeHtml(row.status)}">
                    <span><strong>${escapeHtml(row.service)}</strong><em>${escapeHtml(row.bottleneck)}</em></span>
                    <b>${row.demand.toLocaleString("en-IN")}</b>
                    <i style="--service-fill:${row.conversion}%"><u></u></i>
                    <span><strong>${escapeHtml(row.branch)}</strong><em>${escapeHtml(row.owner)}</em></span>
                    ${v2Pill(row.status)}
                  </button>
                `)
                .join("")}
            </article>
            <article class="v2-panel v2-service-branch-grid">
              <div class="v2-panel-heading">
                <div><span>Branch Service Mix</span><strong>Which service line explains each branch’s operating pressure.</strong></div>
              </div>
              <div class="v2-service-tiles">
                ${[
                  ["Westside", "OPD growth", "Protect conversion", "Low"],
                  ["Eastview", "Pharmacy attach", "Use as overflow branch", "Low"],
                  ["Northgate", "Renal diagnostics wait", "Assign report owner", "Watch"],
                  ["Central", "Access recovery", "Clear beds before 4 PM", "High"],
                  ["Riverside", "Dialysis holds", "Repair / transfer sessions", "High"],
                ]
                  .map(([branch, signal, action, status]) => `
                    <button type="button" class="v2-service-tile" data-v2-drawer="${escapeHtml(branch)}" data-v2-kind="Branch service mix" data-v2-status="${escapeHtml(status)}">
                      <span>${escapeHtml(branch)}</span>
                      <strong>${escapeHtml(signal)}</strong>
                      <em>${escapeHtml(action)}</em>
                      ${v2Pill(status)}
                    </button>
                  `)
                  .join("")}
              </div>
            </article>
          </div>
          ${v2WorkflowTable(isCoo ? "Service Execution Detail" : "Service Comparison Detail", "A branch/service operating table, not the Finance revenue-analysis workspace.", ["Service", "Branch focus", "Demand", "Conversion", "Bottleneck", "Owner", "Status"], serviceRows.map((row) => [
            { value: row.service, note: isCoo ? "Operations" : "Service portfolio" },
            row.branch,
            row.demand.toLocaleString("en-IN"),
            `${row.conversion}%`,
            row.bottleneck,
            row.owner,
            { value: row.status, status: row.status },
          ]))}
        </section>
      `;
    }

    if (tab === "branch-detail") {
      return `
        ${v2MetricCards([
          { label: "Selected Branch", value: appState.branch === "All Network Branches" ? "Central" : appState.branch, delta: "Detail" },
          { label: "Live Status", value: "Watch", delta: "Ops + finance" },
          { label: "Open Blockers", value: "12", delta: "4 high" },
          { label: "Primary Constraint", value: "Capacity", delta: "2 actions" },
        ])}
        ${v2TileGrid("Branch Detail", "One branch profile across flow, capacity, dialysis, staffing, and revenue cycle.", [
          { label: "Patient flow", title: "OPD pressure", value: "High", note: "22m avg wait.", status: "High" },
          { label: "Capacity", title: "Bed pressure", value: "88.8%", note: "2 blocked ICU beds.", status: "High" },
          { label: "Dialysis", title: "Shift utilization", value: "75%", note: "Evening gap." },
          { label: "Staffing", title: "Coverage", value: "82%", note: "Night gap.", status: "Watch" },
          { label: "Revenue cycle", title: "Blockers", value: "₹1.2Cr", note: "TPA aging.", status: "High" },
        ])}
      `;
    }

    if (tab === "financial-contribution") {
      return `
        ${v2MetricCards([
          { label: "Network Revenue", value: "₹42.8Cr", delta: "+4.2%" },
          { label: "Top Branch", value: "Westside", delta: "₹9.8Cr" },
          { label: "Margin Watch", value: "2 branches", delta: "Central · Riverside" },
        ])}
        <div class="v2-workspace-split">
          ${v2WorkflowTable("Branch Contribution Ledger", "Revenue, margin, capacity, and why the branch needs review.", ["Branch", "Revenue", "EBITDA margin", "Occupancy", "ALOS", "Decision"], v2Branches.map((branch) => [
            { value: branch.name, note: branch.risk === "High" ? "Executive review" : "Stable" },
            `₹${branch.revenue}Cr`,
            `${branch.margin}%`,
            `${branch.occupancy}%`,
            `${branch.alos}d`,
            { value: branch.risk === "High" ? "Open finance detail" : "Monitor", status: branch.risk },
          ]))}
          ${v2ActionQueue("Contribution Follow-Up", "Where the branch comparison should send the user next.", [
            { label: "Finance", title: "Open Revenue Analysis", detail: "Use the selected branch as a filter when moving into Finance.", status: "Low" },
            { label: "Margin", title: "Central margin pressure", detail: "Staffing and collection drag explain most of the gap.", status: "High" },
            { label: "Capacity", title: "Riverside ALOS pressure", detail: "Capacity and dialysis constraints are suppressing contribution.", status: "High" },
          ])}
        </div>
      `;
    }

    if (["capacity", "dialysis", "staffing", "patient-flow"].includes(tab)) {
      const title = {
        capacity: "Branch Bed Pressure Comparison",
        dialysis: "Dialysis Utilization by Branch",
        staffing: "Staffing Gap by Branch",
        "patient-flow": "OPD / IPD Load by Branch",
      }[tab];
      const rows = v2Branches.map((branch) => ({
        name: branch.name,
        value: tab === "capacity" ? branch.occupancy : tab === "dialysis" ? branch.dialysis : tab === "staffing" ? 100 - branch.staffing : branch.opd,
        display: tab === "patient-flow" ? `${branch.opd}` : `${tab === "staffing" ? 100 - branch.staffing : tab === "capacity" ? branch.occupancy : branch.dialysis}%`,
        note: `${branch.risk} risk`,
        status: branch.risk,
      }));
      const primaryBoard =
        tab === "staffing"
          ? v2ShiftGridBoard("Staffing Coverage by Shift", "Coverage gaps by branch and shift.", [
              { branch: "Westside", values: [98, 96, 91, 88] },
              { branch: "Eastview", values: [96, 94, 89, 84] },
              { branch: "Central", values: [90, 86, 78, 72] },
              { branch: "Riverside", values: [87, 81, 74, 68] },
            ])
          : v2PressureBoard(title, "Branch comparison against the operating threshold.", rows, {
              max: tab === "patient-flow" ? 1400 : 100,
              target: tab === "patient-flow" ? 1000 : tab === "capacity" ? 85 : 82,
              unit: tab === "patient-flow" ? "" : "%",
            });
      return `
        ${v2MetricCards(v2Spec(role, "/branches", tab).metrics)}
        <div class="v2-workspace-split">
          ${primaryBoard}
          ${v2ActionQueue("Branch Actions", "The decision queue for this comparison view.", [
            { label: tab === "staffing" ? "Staffing" : "Capacity", title: tab === "staffing" ? "Night cover needed" : "Central and Riverside need owner review", detail: "Use row selection to open branch detail and assign action.", status: "High" },
            { label: "Buffer", title: "Eastview can absorb load", detail: "Use Eastview as the operating buffer before adding new capacity.", status: "Low" },
            { label: "Service", title: tab === "dialysis" ? "Riverside machine holds" : "Dialysis evening gap", detail: "This links to the Dialysis Program execution view.", status: "Watch" },
          ])}
        </div>
        ${v2WorkflowTable("Branch Operations Detail", "Same rows, different operational dimensions for stable comparison.", ["Branch", "OPD load", "Occupancy", "Discharge delay", "Dialysis", "Staffing gap", "Status"], v2Branches.map((branch) => [
          { value: branch.name, note: `${branch.risk} risk` },
          `${branch.opd}`,
          `${branch.occupancy}%`,
          branch.risk === "High" ? "High" : "Watch",
          `${branch.dialysis}%`,
          `${100 - branch.staffing}%`,
          { value: branch.risk, status: branch.risk },
        ]))}
      `;
    }

    if (tab === "risk") {
      return `
        ${v2MetricCards(v2Spec(role, "/branches", tab).metrics)}
        <div class="v2-workspace-split">
          ${v2WorkflowTable("Branch Risk Register", "Risk is shown as an action register, not a decorative card grid.", ["Branch", "Primary risk", "Evidence", "Owner", "Next action", "Status"], [
            [{ value: "Central", note: "Capacity + billing" }, "Discharge drag", "88.8% occ · 18 billing cases", "Ops + RC", "Close billing queue", { value: "High", status: "High" }],
            [{ value: "Riverside", note: "Dialysis + staffing" }, "Machine holds", "69% dialysis · 2 machines", "Dialysis lead", "Repair / transfer", { value: "High", status: "High" }],
            [{ value: "Northgate", note: "Watch" }, "Procedure recovery", "4.3d ALOS", "OT manager", "Monitor recovery", { value: "Watch", status: "Medium" }],
            [{ value: "Westside", note: "Benchmark" }, "None", "86.5% occ · high revenue", "Branch lead", "Protect growth", { value: "Low", status: "Low" }],
          ])}
          ${v2ActionQueue("Executive Watchlist", "Only risks that need executive attention.", [
            { label: "High", title: "Central discharge billing", detail: "Capacity pressure is tied to billing closure, so this should route to Finance/RC workflow.", status: "High" },
            { label: "High", title: "Riverside dialysis execution", detail: "Machine and night staffing gaps are compounding patient flow.", status: "High" },
          ])}
        </div>
      `;
    }

    return `
      ${v2MetricCards([
        { label: "Top Branch", value: "Westside", delta: "₹9.8Cr · 86.5% occ" },
        { label: "Under Pressure", value: "2 branches", delta: "Central · Riverside" },
        { label: "Service Drag", value: "Dialysis", delta: "Evening gaps" },
        { label: "Action Needed", value: "3 owners", delta: "Today" },
      ])}
      <div class="v2-workspace-split">
        ${v2BranchDecisionBoard("Branch Decision Board", "Compare which branch needs what kind of action.", [
          { branch: "Westside", primary: "Protect growth", detail: "Highest revenue and healthy occupancy; keep conversion stable.", status: "Low" },
          { branch: "Eastview", primary: "Maintain", detail: "Good revenue, balanced capacity, low operational risk.", status: "Low" },
          { branch: "Northgate", primary: "Watch dialysis", detail: "Medium dialysis and staffing pressure can create service leakage.", status: "Watch" },
          { branch: "Central", primary: "Fix discharge drag", detail: "Capacity pressure and billing delays are suppressing throughput.", status: "High" },
          { branch: "Riverside", primary: "Clear machine holds", detail: "Dialysis, ALOS, and staffing gaps are compounding.", status: "High" },
        ])}
        ${v2ActionQueue("Decision Queue", "Branch decisions sorted by urgency.", [
          { label: "Benchmark", title: "Westside", detail: "Protect growth and use it as the comparison baseline.", status: "Low" },
          { label: "Executive review", title: "Central", detail: "Discharge billing and bed release require same-day action.", status: "High" },
          { label: "Ops review", title: "Riverside", detail: "Dialysis machines and night staffing need branch-level closure.", status: "High" },
        ])}
      </div>
      ${v2WorkflowTable("Branch Comparison Detail", "Stable branch comparison columns across the page.", ["Branch", "Revenue", "Occupancy", "ALOS", "Dialysis", "Staffing", "Status"], v2Branches.map((branch) => [
        { value: branch.name, note: `${branch.risk} risk` },
        `₹${branch.revenue}Cr`,
        `${branch.occupancy}%`,
        `${branch.alos}d`,
        `${branch.dialysis}%`,
        `${branch.staffing}%`,
        { value: branch.risk, status: branch.risk },
      ]))}
    `;
  }

  function v2ReportIcon(icon) {
    const paths = {
      dashboard: '<rect x="4" y="4" width="16" height="16" rx="3"></rect><path d="M8 14v2"></path><path d="M12 10v6"></path><path d="M16 8v8"></path>',
      bar: '<path d="M4 19h16"></path><rect x="6" y="11" width="3" height="5" rx="1"></rect><rect x="11" y="7" width="3" height="9" rx="1"></rect><rect x="16" y="4" width="3" height="12" rx="1"></rect>',
      finance: '<path d="M12 3v18"></path><path d="M16 7.5c-.7-1-1.9-1.5-3.4-1.5-2.1 0-3.6 1-3.6 2.5 0 3.5 7 1.7 7 5 0 1.5-1.5 2.5-3.7 2.5-1.7 0-3.1-.6-3.9-1.7"></path>',
      branch: '<rect x="4" y="5" width="6" height="14" rx="1.5"></rect><rect x="14" y="3" width="6" height="16" rx="1.5"></rect><path d="M7 9h0"></path><path d="M7 13h0"></path><path d="M17 7h0"></path><path d="M17 11h0"></path><path d="M17 15h0"></path>',
      capacity: '<path d="M4 16c2-4 5-6 8-6s6 2 8 6"></path><path d="M4 16h16"></path><path d="M12 10V5"></path><path d="M9 5h6"></path>',
      dialysis: '<path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11Z"></path><path d="M9 14h6"></path>',
      quality: '<path d="M12 3 5 6v5c0 4.5 2.8 8 7 10 4.2-2 7-5.5 7-10V6l-7-3Z"></path><path d="m9 12 2 2 4-5"></path>',
      staff: '<path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"></path><path d="M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"></path><path d="M3 20c.8-3 2.6-5 5-5s4.2 2 5 5"></path><path d="M11 20c.7-2.6 2.4-4.2 5-4.2 2.1 0 3.7 1.2 5 4.2"></path>',
      queue: '<path d="M7 7h10"></path><path d="M7 12h10"></path><path d="M7 17h7"></path><path d="M4 7h0"></path><path d="M4 12h0"></path><path d="M4 17h0"></path>',
      calendar: '<rect x="4" y="5" width="16" height="15" rx="2"></rect><path d="M8 3v4"></path><path d="M16 3v4"></path><path d="M4 10h16"></path>',
      download: '<path d="M12 3v11"></path><path d="m8 10 4 4 4-4"></path><path d="M5 19h14"></path>',
      doc: '<path d="M7 3h7l4 4v14H7z"></path><path d="M14 3v5h5"></path><path d="M9 13h6"></path><path d="M9 17h6"></path>',
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[icon] || paths.doc}</svg>`;
  }

  function v2ReportLibrary(role) {
    const cards =
      role === "HR_ADMIN"
        ? [
            { icon: "staff", tag: "Staff", title: "Staff Directory Export", description: "Current staff roster by branch, department, role, and status.", format: "XLSX", cadence: "Weekly" },
            { icon: "branch", tag: "Department", title: "Department Staffing Report", description: "Headcount, open roles, department heads, and staffing risk.", format: "PDF", cadence: "Weekly" },
            { icon: "queue", tag: "Onboarding", title: "Onboarding Pipeline", description: "Offer, documents, clearance, biometric, and access progress.", format: "XLSX", cadence: "Daily" },
            { icon: "dashboard", tag: "Attendance", title: "Attendance Snapshot", description: "Branch and department attendance with exception counts.", format: "PDF", cadence: "Daily" },
            { icon: "capacity", tag: "Biometric", title: "Biometric Enrollment Audit", description: "Enrollment status, device station gaps, and consent coverage.", format: "XLSX", cadence: "Daily" },
            { icon: "doc", tag: "Compliance", title: "HR Compliance Packet", description: "Mandatory document completion and access-control evidence.", format: "PDF", cadence: "Monthly" },
          ]
        : role === "COO"
        ? [
            { icon: "dashboard", tag: "Daily", title: "Operations Summary", description: "Operating snapshot across patient flow, staffing, and blockers.", format: "PDF", cadence: "Daily" },
            { icon: "bar", tag: "KPI", title: "Management KPI", description: "Branch KPIs with operational comparisons.", format: "PDF", cadence: "Weekly" },
            { icon: "queue", tag: "RC Ops", title: "Revenue Cycle Ops", description: "Billing, claims aging, discharge billing, and documents.", format: "XLSX", cadence: "Weekly" },
            { icon: "branch", tag: "Branch", title: "Branch Performance", description: "Branch ranking, service demand, and risk trends.", format: "PDF", cadence: "Weekly" },
            { icon: "capacity", tag: "Capacity", title: "Capacity Report", description: "Occupancy, ALOS, admissions, and discharge flow.", format: "PDF", cadence: "Weekly" },
            { icon: "dialysis", tag: "Dialysis", title: "Dialysis Report", description: "Sessions, utilization, exceptions, and machine status.", format: "PDF", cadence: "Weekly" },
            { icon: "staff", tag: "Staffing", title: "Staffing Report", description: "Shift coverage, gaps, and owner actions.", format: "XLSX", cadence: "Daily" },
            { icon: "doc", tag: "Archive", title: "Legacy BI Reports", description: "Detailed BI extracts and historical downloads.", format: "ZIP", cadence: "Ad hoc" },
          ]
        : [
            { icon: "dashboard", tag: "Board", title: "Executive Summary", description: "One-page executive snapshot for board review.", format: "PDF", cadence: "Weekly" },
            { icon: "bar", tag: "KPI", title: "Management KPI", description: "All KPIs across branches with comparisons.", format: "PDF", cadence: "Weekly" },
            { icon: "finance", tag: "Finance", title: "Finance Report", description: "Revenue, EBITDA, payor, and collection performance.", format: "XLSX", cadence: "Monthly" },
            { icon: "branch", tag: "Branch", title: "Branch Performance", description: "Branch ranking, contribution, risk, and trends.", format: "PDF", cadence: "Quarterly" },
            { icon: "capacity", tag: "Capacity", title: "Capacity Report", description: "Occupancy, ALOS, admissions, and discharge flow.", format: "PDF", cadence: "Weekly" },
            { icon: "dialysis", tag: "Dialysis", title: "Dialysis Report", description: "Sessions, utilization, missed treatments, and contribution.", format: "PDF", cadence: "Weekly" },
            { icon: "doc", tag: "Archive", title: "Legacy BI Reports", description: "Detailed BI extracts and historical downloads.", format: "ZIP", cadence: "Ad hoc" },
          ];
    const rows =
      role === "HR_ADMIN"
        ? [
            ["Staff Directory · Today", "HR Admin", "Today", "Daily", "Ready"],
            ["Biometric Audit · Week", "System", "1 day ago", "Weekly", "Ready"],
            ["Onboarding Pipeline · Today", "HR Admin", "Today", "Daily", "Ready"],
            ["Department Staffing · QTD", "System", "3 days ago", "Weekly", "Ready"],
            ["Compliance Packet · June", "HR Admin", "8 days ago", "Monthly", "Scheduled"],
          ]
        : role === "COO"
        ? [
            ["Daily Operations · Today", "Asha M.", "Today", "Daily", "Ready"],
            ["Branch Ops · Week", "System", "1 day ago", "Weekly", "Ready"],
            ["Discharge Flow · Nov 20", "Asha M.", "5 days ago", "Daily", "Ready"],
            ["Dialysis · Weekly Recap", "System", "6 days ago", "Weekly", "Scheduled"],
            ["Revenue Cycle · Aging", "RC Ops", "7 days ago", "Weekly", "Ready"],
          ]
        : [
            ["Executive Summary · Nov", "Sarah Chen", "2 days ago", "Weekly", "Ready"],
            ["Branch Performance · Q4", "System", "3 days ago", "Quarterly", "Ready"],
            ["Discharge Report · Nov 20", "Asha M.", "5 days ago", "Daily", "Ready"],
            ["Dialysis · Weekly Recap", "System", "6 days ago", "Weekly", "Scheduled"],
            ["Finance Close · Nov", "Finance Ops", "12 days ago", "Monthly", "Ready"],
          ];

    return `
      <section class="v2-simple-reports">
        <div class="v2-report-section-heading">
          <span>Create report</span>
          <strong>Choose a template to generate a fresh export.</strong>
        </div>
        <div class="v2-simple-report-grid">
          ${cards
            .map(
              (card) => `
                <button type="button" class="v2-simple-report-card" data-v2-drawer="${escapeHtml(card.title)}" data-v2-kind="Report" data-v2-status="Ready">
                  <span class="v2-simple-report-top">
                    <span class="v2-report-icon v2-report-icon--${escapeHtml(card.icon)}" aria-hidden="true">${v2ReportIcon(card.icon)}</span>
                  </span>
                  <strong>${escapeHtml(card.title)}</strong>
                  <p>${escapeHtml(card.description)}</p>
                  <span class="v2-report-meta"><em>${escapeHtml(card.format)}</em><em>${escapeHtml(card.cadence)}</em></span>
                  <span class="v2-report-action">${v2ReportIcon("download")} Generate report</span>
                </button>
              `,
            )
            .join("")}
        </div>
        <article class="v2-panel v2-simple-report-history">
          <div class="v2-simple-report-history-header">
            <div>
              <strong>Export history</strong>
            </div>
            <div class="v2-report-history-filter-wrap">
              <button type="button" class="v2-report-history-filter" data-v2-report-timeframe aria-haspopup="menu" aria-expanded="false">
                <span>${escapeHtml(appState.timeframe)}</span>
              </button>
              <div class="v2-local-menu v2-report-history-menu" role="menu" hidden>
                ${globalControls
                  .find((control) => control.kind === "timeframe")
                  .options.map(
                    (option) => `
                      <button type="button" role="menuitemradio" aria-checked="${String(option === appState.timeframe)}" data-v2-report-timeframe-option="${escapeHtml(option)}">
                        ${escapeHtml(option)}
                      </button>
                    `,
                  )
                  .join("")}
              </div>
            </div>
          </div>
          <div class="v2-simple-report-table">
            <b>Report</b>
            <b>Generated by</b>
            <b>Generated</b>
            <b>Schedule</b>
            <b>Status</b>
            <b>Action</b>
            ${rows
              .map(
                (row) => `
                  <button type="button" class="v2-simple-report-row" data-v2-drawer="${escapeHtml(row[0])}" data-v2-kind="Report run" data-v2-status="${escapeHtml(row[4])}">
                    <span>${escapeHtml(row[0])}</span>
                  </button>
                  <span>${escapeHtml(row[1])}</span>
                  <span>${escapeHtml(row[2])}</span>
                  <span>${escapeHtml(row[3])}</span>
                  <span>${v2Pill(row[4])}</span>
                  <button type="button" class="v2-report-download${row[4] === "Scheduled" ? " is-scheduled" : ""}" ${row[4] === "Scheduled" ? "disabled" : `data-v2-drawer="${escapeHtml(row[0])}" data-v2-kind="Report export" data-v2-status="${escapeHtml(row[4])}"`}>
                    ${v2ReportIcon("download")}
                    <span>Download</span>
                  </button>
                `,
              )
              .join("")}
          </div>
        </article>
      </section>
    `;
  }

  function v2Body(role, path, tab) {
    if (path === "/hrms") return renderHrmsWorkspace(tab);
    const spec = v2Spec(role, path, tab);
    if (role === "CEO" && path === "/finance" && tab === "revenue-analysis") {
      return renderRevenueAnalysisWorkspace(role, `${appState.branch} · ${appState.timeframe}`);
    }
    if (path === "/finance") return renderFinanceAnalysisTab(tab);
    if (path === "/capacity-flow") return renderCapacityWorkspace(tab);
    if (path === "/operations") return renderOperationsWorkspace(tab);
    if (path === "/dialysis-program") return renderDialysisWorkspace(role, tab);
    if (path === "/revenue-cycle-ops") return renderRevenueCycleWorkspace(tab);
    if (path === "/branches") return renderBranchesWorkspace(role, tab);
    if (spec.isReports) return v2ReportLibrary(role, tab);
    if (spec.isDrilldown) return v2DrilldownBoard();
    if (spec.isQueue) return `${v2MetricCards(spec.metrics)}${v2QueueBoard(spec, role, path, tab)}`;
    if (spec.isMatrix) return `${v2MetricCards(spec.metrics)}${v2MatrixBoard(spec, role, path, tab)}`;
    return `${v2MetricCards(spec.metrics)}${v2RankingBoard(spec, role, path, tab)}`;
  }

  function v2OpenHrmsStaffDrawer(container) {
    const drawer = document.createElement("aside");
    drawer.className = "v2-drawer";
    drawer.innerHTML = `
      <div class="v2-drawer-scrim" data-v2-close-drawer></div>
      <div class="v2-drawer-panel hrms-drawer-panel" role="dialog" aria-modal="false" aria-label="Add staff">
        <button type="button" class="v2-drawer-close" data-v2-close-drawer>Close</button>
        <span class="v2-kicker">Staff onboarding</span>
        <h2>Add staff</h2>
        ${v2Pill("Open")}
        ${hrmsStaffCreationForm("drawer")}
      </div>
    `;
    container.appendChild(drawer);
  }

  function v2OpenDrawer(container, trigger) {
    container.querySelector(".v2-drawer")?.remove();
    const title = trigger.dataset.v2Drawer || "Selected item";
    const kind = trigger.dataset.v2Kind || "Detail";
    const status = trigger.dataset.v2Status || "Open";
    if (currentPath() === "/hrms" && /add staff/i.test(title)) {
      v2OpenHrmsStaffDrawer(container);
      return;
    }
    const restricted = /restricted/i.test(status);
    const role = activeRole();
    const path = currentPath();
    const rowValue =
      trigger.querySelector(".v2-contribution-value, .v2-driver-chip strong, .v2-analysis-stat strong, .v2-revenue-time-bar span, .v2-tile-card strong")?.textContent.trim() ||
      trigger.querySelector("strong")?.textContent.trim() ||
      status;
    const rowNote =
      trigger.querySelector(".v2-contribution-label em, .v2-driver-chip em, .v2-analysis-stat span, .v2-tile-card p, em, p")?.textContent.trim() ||
      `${kind} selected from the current view.`;
    const filterContext = v2LocalFilterContext(role);
    const localScope = [filterContext.period, filterContext.branchScope, filterContext.department, filterContext.person, filterContext.patientMix]
      .filter((item) => item && item !== "All")
      .join(" · ");
    const scope = localScope || `${appState.branch} · ${appState.timeframe}`;
    const isBranchFlow = path === "/branches";
    const isCapacityFlow = path === "/capacity-flow" || path === "/operations";
    const isFinanceFlow = path === "/finance" || path === "/revenue-cycle-ops";
    const isDialysisFlow = path === "/dialysis-program";
    const isHrmsFlow = path === "/hrms";
    const primaryMetric = restricted ? "Restricted" : rowValue;
    const drawerInsight = restricted
      ? "Access requires an approved role permission."
      : isBranchFlow
        ? `${rowNote} Use it to compare pressure, capacity, service demand, and risk before assigning work.`
        : isCapacityFlow
          ? `${title} is selected from the flow board. Check queue size, timing, and owner before moving the case.`
          : isFinanceFlow
            ? `${title} is selected from the finance workflow. Check contribution, mix, collections, and source-level blockers.`
            : isDialysisFlow
              ? `${title} is selected from dialysis operations. Check shift utilization, missed sessions, and machine capacity before rescheduling.`
              : isHrmsFlow
                ? `${title} is selected from HRMS. Review access, role, onboarding state, and biometric readiness.`
                : rowNote;
    const drawerNext = restricted
      ? "Request access only if this detail is required for the workflow."
      : isBranchFlow
        ? status === "Low"
          ? "Keep this as overflow capacity. Compare it against high-pressure branches before moving sessions or beds."
          : "Assign an owner, check capacity, then use Branch Detail only if a decision needs follow-up."
        : isCapacityFlow
          ? "Open the relevant queue, confirm the blocker, and assign the next operational owner."
          : isFinanceFlow
            ? "Validate the driver, then open drilldown only if the amount needs source-level explanation."
            : isDialysisFlow
              ? "Confirm machine and staff coverage, then move sessions into the next available slot."
              : isHrmsFlow
                ? "Update role/access status first, then complete onboarding or biometric scheduling."
                : "Review the related view, then assign an owner if the item needs action.";
    const drawerChecklist = isBranchFlow
      ? ["Capacity available", "Service demand match", "Risk level confirmed"]
      : isCapacityFlow
        ? ["Queue owner assigned", "Delay reason confirmed", "Next handoff clear"]
        : isFinanceFlow
          ? ["Revenue driver checked", "Collection risk reviewed", "Drilldown needed only if unresolved"]
          : isDialysisFlow
            ? ["Machine slot checked", "Staff coverage checked", "Patient impact reviewed"]
            : isHrmsFlow
              ? ["Role assigned", "Access approved", "Biometric status checked"]
              : ["Context reviewed", "Owner assigned", "Next view selected"];
    const drawerCopy = {
      "/finance": {
        owner: "Finance analytics",
        insight: "Use this selection to explain contribution, mix, visit volume, and collection drag without leaving the finance flow.",
        next: "Compare the selected item in Revenue Analysis, then open Revenue Drilldown only when you need source-level depth.",
        links: [
          ["Revenue Analysis", "/finance?tab=revenue-analysis"],
          ["Revenue Drilldown", "/finance?tab=revenue-drilldown"],
          ["Payor & Collections", "/finance?tab=payor-collections"],
        ],
      },
      "/branches": {
        owner: role === "COO" ? "Branch operations" : "Strategy owner",
        insight: "Use this selection to compare branch pressure, service demand, capacity, and operational risk.",
        next: "Open Branch Detail if the item needs an owner action; otherwise compare it against Capacity and Risk.",
        links:
          role === "COO"
            ? [
                ["Branch Detail", "/branches?tab=branch-detail"],
                ["Capacity", "/branches?tab=capacity"],
                ["Staffing", "/branches?tab=staffing"],
              ]
            : [
                ["Branch Detail", "/branches?tab=branch-detail"],
                ["Capacity", "/branches?tab=capacity"],
                ["Risk", "/branches?tab=risk"],
              ],
      },
      "/capacity-flow": {
        owner: "Patient flow owner",
        insight: "Use this selection to understand bed pressure, ALOS drag, admission/discharge timing, and delay source.",
        next: "Check the delay contributor before assigning bed release or discharge billing action.",
        links: [
          ["Occupancy", "/capacity-flow?tab=occupancy"],
          ["ALOS", "/capacity-flow?tab=alos"],
          ["Delay Contributors", "/capacity-flow?tab=delay-contributors"],
        ],
      },
      "/dialysis-program": {
        owner: "Dialysis lead",
        insight: "Use this selection to inspect slot usage, missed sessions, machine holds, and reallocation options.",
        next: "Check shift capacity and machine bay status before assigning recovery work.",
        links:
          role === "COO"
            ? [
                ["Utilization", "/dialysis-program?tab=utilization"],
                ["Sessions", "/dialysis-program?tab=sessions"],
                ["Machines", "/dialysis-program?tab=machines"],
                ["Exceptions", "/dialysis-program?tab=exceptions"],
              ]
            : [
                ["Utilization", "/dialysis-program?tab=utilization"],
                ["Sessions", "/dialysis-program?tab=sessions"],
                ["Missed Sessions", "/dialysis-program?tab=missed-sessions"],
              ],
      },
      "/operations": {
        owner: "Operations owner",
        insight: "Use this selection to inspect patient flow, discharge queue, staffing, procedure readiness, or front-desk load.",
        next: "Move the item to the relevant queue and assign the branch owner.",
        links: [
          ["Patient Flow", "/operations?tab=patient-flow"],
          ["Discharge Flow", "/operations?tab=discharge-flow"],
          ["Staffing", "/operations?tab=staffing"],
        ],
      },
      "/revenue-cycle-ops": {
        owner: "Revenue cycle owner",
        insight: "Use this selection to inspect discharge billing, claims aging, missing documents, and cash-realization blockers.",
        next: "Assign the blocker to the relevant revenue-cycle queue and track closure.",
        links: [
          ["Claims Aging", "/revenue-cycle-ops?tab=claims-aging"],
          ["Discharge Billing", "/revenue-cycle-ops?tab=discharge-billing"],
          ["Missing Documents", "/revenue-cycle-ops?tab=missing-documents"],
        ],
      },
    }[path] || {
      owner: role === "COO" ? "Ops owner" : "Executive owner",
      insight: "Use this selection as a focused detail view for the current workflow.",
      next: "Review the related view, then assign an owner if the item needs action.",
      links: [[routeWorkflowLabels[path] || "Open current view", `${path}${window.location.search}`]],
    };
    const drawer = document.createElement("aside");
    drawer.className = "v2-drawer";
    drawer.innerHTML = `
      <div class="v2-drawer-scrim" data-v2-close-drawer></div>
      <div class="v2-drawer-panel" role="dialog" aria-modal="false" aria-label="${escapeHtml(title)} detail">
        <header class="v2-drawer-header">
          <div>
            <span class="v2-kicker">${escapeHtml(kind)}</span>
            <h2>${escapeHtml(title)}</h2>
          </div>
          <button type="button" class="v2-drawer-close" data-v2-close-drawer>Close</button>
        </header>
        <div class="v2-drawer-status-row">
          ${v2Pill(status)}
          <span>${escapeHtml(scope)}</span>
        </div>
        <div class="v2-drawer-metrics">
          <div><span>Selected signal</span><strong>${escapeHtml(primaryMetric)}</strong></div>
          <div><span>Owner</span><strong>${escapeHtml(restricted ? "RBAC" : drawerCopy.owner)}</strong></div>
          <div><span>Status</span><strong>${escapeHtml(status)}</strong></div>
        </div>
        <div class="v2-blocker-list">
          <span>Why it matters</span>
          <p>${escapeHtml(drawerInsight)}</p>
          <span>Next action</span>
          <p>${escapeHtml(drawerNext)}</p>
        </div>
        <div class="v2-drawer-checklist">
          <span>Check before action</span>
          ${drawerChecklist.map((item) => `<label><input type="checkbox"> ${escapeHtml(item)}</label>`).join("")}
        </div>
        <div class="v2-drawer-related">
          <span>Related views</span>
          ${drawerCopy.links
            .map(([label, href]) => `<a href="${escapeHtml(roleAwareUrl(href, role))}">${escapeHtml(label)}</a>`)
            .join("")}
        </div>
        <div class="v2-drawer-actions">
          <button type="button" data-v2-close-drawer>Done</button>
          <a class="v2-drawer-primary-action" href="${escapeHtml(roleAwareUrl(drawerCopy.links[0]?.[1] || `${path}${window.location.search}`, role))}">${escapeHtml(drawerCopy.links[0]?.[0] || "Open related view")} →</a>
        </div>
      </div>
    `;
    container.appendChild(drawer);
  }

  function v2BindFoundation(container) {
    if (container.dataset.v2Bound === "true") return;
    container.dataset.v2Bound = "true";
    container.addEventListener("click", (event) => {
      const tabButton = event.target.closest("[data-v2-tab]");
      const fieldButton = event.target.closest("[data-v2-field]");
      const drillNode = event.target.closest("[data-v2-drill-node]");
      const drillReset = event.target.closest("[data-v2-drill-reset]");
      const drillTruncate = event.target.closest("[data-v2-drill-truncate]");
      const filterButton = event.target.closest("[data-v2-filter-cycle]");
      const reportTimeframeButton = event.target.closest("[data-v2-report-timeframe]");
      const reportTimeframeOption = event.target.closest("[data-v2-report-timeframe-option]");
      const localFilterButton = event.target.closest("[data-v2-local-filter]");
      const localOptionButton = event.target.closest("[data-v2-local-option]");
      const localResetButton = event.target.closest("[data-v2-local-reset]");
      const resetButton = event.target.closest("[data-v2-reset-filters]");
      const drawerTrigger = event.target.closest("[data-v2-drawer]");
      const drawerClose = event.target.closest("[data-v2-close-drawer]");
      const hrmsCreateForm = event.target.closest("[data-hrms-create-staff]");
      const hrmsDraftButton = event.target.closest("[data-hrms-save-draft]");
      const hrmsBiometricButton = event.target.closest("[data-hrms-schedule-biometric]");

      if (tabButton && container.contains(tabButton)) {
        event.preventDefault();
        const nextTab = tabButton.dataset.v2Tab || "";
        const updates = { tab: nextTab, field: null };
        if (currentPath() === "/branches") {
          const currentRole = container.closest(".v2-foundation")?.dataset.v2Role || v2RoleForPage();
          updates.role = sharedBranchTabs.has(nextTab) ? currentRole : null;
        }
        v2UpdateUrl(updates);
        return;
      }

      if (fieldButton && container.contains(fieldButton)) {
        event.preventDefault();
        const nextField = fieldButton.dataset.v2Field || "";
        const groupedKey = v2FilterKeyForField(nextField);
        const updates = { field: nextField };
        if (groupedKey) updates[groupedKey] = null;
        v2UpdateUrl(updates);
        return;
      }

      if (drillTruncate && container.contains(drillTruncate)) {
        event.preventDefault();
        const length = Math.max(1, Number(drillTruncate.dataset.v2DrillTruncate || "1"));
        const nextPath = v2CurrentDrillPath().slice(0, length);
        v2CaptureDrillScroll();
        v2UpdateUrl({ drill: v2DrillPathValue(nextPath), drillClosed: "1" });
        return;
      }

      if (drillNode && container.contains(drillNode)) {
        event.preventDefault();
        const level = Number(drillNode.dataset.v2DrillLevel || "0");
        const nodeId = drillNode.dataset.v2DrillNode || "";
        const nextPath = v2CurrentDrillPath().slice(0, level);
        nextPath[level] = nodeId;
        v2CaptureDrillScroll();
        v2UpdateUrl({ drill: v2DrillPathValue(nextPath), drillClosed: null });
        return;
      }

      if (drillReset && container.contains(drillReset)) {
        event.preventDefault();
        v2CaptureDrillScroll();
        v2UpdateUrl({ drill: "total", drillClosed: null });
        return;
      }

      if (filterButton && container.contains(filterButton)) {
        event.preventDefault();
        const control = globalControls.find((item) => item.kind === filterButton.dataset.v2FilterCycle);
        if (!control) return;
        const current = appState[control.kind];
        const currentIndex = control.options.indexOf(current);
        const nextOption = control.options[(currentIndex + 1) % control.options.length];
        if (control.kind === "timeframe") {
          setGlobalTimeframe(nextOption);
        } else {
          appState[control.kind] = nextOption;
        }
        delete container.dataset.v2FoundationSignature;
        scheduleEnhance();
        return;
      }

      if (reportTimeframeButton && container.contains(reportTimeframeButton)) {
        event.preventDefault();
        const menu = reportTimeframeButton.nextElementSibling;
        if (!menu?.classList.contains("v2-local-menu")) return;
        const isOpen = !menu.hidden;
        closeV2LocalMenus(container, isOpen ? null : menu);
        menu.hidden = isOpen;
        reportTimeframeButton.setAttribute("aria-expanded", String(!isOpen));
        return;
      }

      if (reportTimeframeOption && container.contains(reportTimeframeOption)) {
        event.preventDefault();
        setGlobalTimeframe(reportTimeframeOption.dataset.v2ReportTimeframeOption || appState.timeframe);
        closeV2LocalMenus(container);
        delete container.dataset.v2FoundationSignature;
        scheduleEnhance();
        return;
      }

      if (localFilterButton && container.contains(localFilterButton)) {
        event.preventDefault();
        const menu = localFilterButton.nextElementSibling;
        if (!menu?.classList.contains("v2-local-menu")) return;
        const isOpen = !menu.hidden;
        closeV2LocalMenus(container, isOpen ? null : menu);
        menu.hidden = isOpen;
        localFilterButton.setAttribute("aria-expanded", String(!isOpen));
        return;
      }

      if (localOptionButton && container.contains(localOptionButton)) {
        event.preventDefault();
        const key = localOptionButton.dataset.v2LocalOption;
        const value = localOptionButton.dataset.v2LocalValue || "";
        const options = v2LocalFilterOptions(v2RoleForPage())[key] || ["All"];
        closeV2LocalMenus(container);
        v2UpdateUrl({ [key]: value === options[0] ? null : value });
        return;
      }

      if (localResetButton && container.contains(localResetButton)) {
        event.preventDefault();
        v2UpdateUrl({ period: null, branchScope: null, department: null, person: null, patientMix: null });
        return;
      }

      if (resetButton && container.contains(resetButton)) {
        event.preventDefault();
        appState.branch = "All Network Branches";
        appState.timeframe = "Last 30 days";
        appState.comparison = "vs. Previous period";
        delete container.dataset.v2FoundationSignature;
        scheduleEnhance();
        return;
      }

      if (hrmsDraftButton && container.contains(hrmsDraftButton)) {
        event.preventDefault();
        const form = hrmsDraftButton.closest("[data-hrms-create-staff]");
        const statusNode = form?.querySelector(".hrms-form-status");
        if (statusNode) statusNode.textContent = "Draft saved for review.";
        return;
      }

      if (hrmsBiometricButton && container.contains(hrmsBiometricButton)) {
        event.preventDefault();
        const form = hrmsBiometricButton.closest("[data-hrms-create-staff]");
        const statusNode = form?.querySelector(".hrms-form-status");
        if (statusNode) statusNode.textContent = "Biometric slot scheduled at the selected enrollment station.";
        return;
      }

      if (hrmsCreateForm && container.contains(hrmsCreateForm) && event.type === "click") {
        const submitButton = event.target.closest('button[type="submit"]');
        if (submitButton) {
          event.preventDefault();
          const name = hrmsCreateForm.querySelector('[name="fullName"]')?.value?.trim() || "New staff";
          const branch = hrmsCreateForm.querySelector('[name="branch"]')?.value || "selected branch";
          const department = hrmsCreateForm.querySelector('[name="department"]')?.value || "selected department";
          const statusNode = hrmsCreateForm.querySelector(".hrms-form-status");
          if (statusNode) statusNode.textContent = `${name} created for ${department} at ${branch}. Biometrics and access are queued.`;
          return;
        }
      }

      if (drawerClose && container.contains(drawerClose)) {
        event.preventDefault();
        container.querySelector(".v2-drawer")?.remove();
        return;
      }

      if (drawerTrigger && container.contains(drawerTrigger)) {
        event.preventDefault();
        closeV2LocalMenus(container);
        const drawerTitle = drawerTrigger.dataset.v2Drawer || "";
        const drawerKind = drawerTrigger.dataset.v2Kind || "";
        if (currentPath() === "/hrms" && /staff onboarding/i.test(drawerKind) && /add staff/i.test(drawerTitle)) {
          v2OpenDrawer(container, drawerTrigger);
        }
      }
    });
    container.addEventListener("submit", (event) => {
      const form = event.target.closest("[data-hrms-create-staff]");
      if (!form || !container.contains(form)) return;
      event.preventDefault();
      const name = form.querySelector('[name="fullName"]')?.value?.trim() || "New staff";
      const branch = form.querySelector('[name="branch"]')?.value || "selected branch";
      const department = form.querySelector('[name="department"]')?.value || "selected department";
      const statusNode = form.querySelector(".hrms-form-status");
      if (statusNode) statusNode.textContent = `${name} created for ${department} at ${branch}. Biometrics and access are queued.`;
    });
  }

  function renderV2Foundation() {
    const path = currentPath();
    if (path === "/quality-safety") {
      window.history.replaceState({}, "", "/overview");
      scheduleEnhance();
      return true;
    }
    if (!v2InternalRoute()) {
      delete document.body.dataset.v2Foundation;
      return false;
    }

    const role = v2RoleForPage();
    const config = v2RouteConfig(role, path);
    if (!config) return false;

    const params = v2Params();
    let tab = params.get("tab") || v2DefaultTab(config);
    if (!config.tabs.some(([id]) => id === tab)) tab = v2DefaultTab(config);

    const container = mainPageContainer();
    if (!container) return false;

    document.body.dataset.v2Foundation = "true";
    syncV2ShellChrome(config);
    const signature = [
      role,
      path,
      tab,
      params.get("field") || "",
      params.get("drill") || "",
      params.get("period") || "",
      params.get("branchScope") || "",
      params.get("department") || "",
      params.get("person") || "",
      params.get("patientMix") || "",
      appState.branch,
      appState.timeframe,
      appState.comparison,
    ].join("|");
    if (container.dataset.v2FoundationSignature === signature) return true;

    container.dataset.v2FoundationSignature = signature;
    container.classList.add("v2-page-container");
    container.innerHTML = v2PageShell(role, config, tab, v2Body(role, path, tab));
    v2BindFoundation(container);
    return true;
  }

  function activeOverviewMetricLabel() {
    const activeCard =
      document.querySelector("main section.space-y-6 button[class*='ring-primary']") ||
      document.querySelector("main section.space-y-6 button");
    return activeCard?.querySelector("[class*='uppercase']")?.textContent.trim() || activeCard?.textContent.trim() || "";
  }

  function overviewRoleView(role = activeRole()) {
    return overviewRoleViews[role] || overviewRoleViews.CEO;
  }

  function overviewTitleReady(role = activeRole()) {
    if (currentPath() !== "/overview") return true;
    const title = document.querySelector("main h1")?.textContent.replace(/\s+/g, " ").trim() || "";
    return overviewRoleView(role).readyTitle.test(title);
  }

  function syncOverviewRoleView() {
    if (currentPath() !== "/overview") {
      delete document.body.dataset.overviewRoleView;
      return false;
    }

    const role = activeRole();
    const view = overviewRoleView(role);
    const container = mainPageContainer();
    if (container) {
      container.dataset.overviewRoute = "true";
      container.dataset.overviewRoleView = role;
    }
    document.body.dataset.overviewRoleView = role;

    const header = document.querySelector("main > header");
    const headerTitle = header?.querySelector("h1");
    if (headerTitle && overviewTitleReady(role) && headerTitle.textContent !== view.title) {
      headerTitle.textContent = view.title;
    }

    const breadcrumbCurrent =
      header &&
      ([...header.querySelectorAll("span")].find((span) => {
        const text = span.textContent.replace(/\s+/g, " ").trim();
        return text && text !== "Executive Dashboard" && span.className.includes("text-foreground");
      }) || [...header.querySelectorAll("span")].filter((span) => span.childElementCount === 0).at(-1));

    if (breadcrumbCurrent && breadcrumbCurrent.textContent.trim() !== "Overview") {
      breadcrumbCurrent.textContent = "Overview";
    }

    if (document.title !== "Overview · ZyephrOS") {
      document.title = "Overview · ZyephrOS";
    }

    return true;
  }

  function overviewDrilldownRoute(role, label) {
    const normalized = label || activeOverviewMetricLabel();
    const match = (overviewDrilldowns[role] || []).find((item) => item.match.test(normalized));
    return match?.route || overviewRoleView(role).detailRoute;
  }

  function updateOverviewActionLinks(role, route) {
    const view = overviewRoleView(role);
    document.querySelectorAll("main a").forEach((link) => {
      const text = link.textContent.replace(/\s+/g, " ").trim();
      if (!/open detail|view breakdown|view all|review watchlist|review attention/i.test(text)) return;
      const target = /watchlist|attention/i.test(text) ? view.attentionRoute : route;
      const roleTarget = roleAwareUrl(target, role);
      if (link.getAttribute("href") !== roleTarget) link.setAttribute("href", roleTarget);
      link.dataset.workflowRoute = roleTarget;
    });
  }

  function enhanceOverviewDrilldowns() {
    if (currentPath() !== "/overview") return;
    const role = activeRole();
    const route = overviewDrilldownRoute(role);

    updateOverviewActionLinks(role, route);

    document.querySelectorAll("main section.space-y-6 button").forEach((button) => {
      const label = button.querySelector("[class*='uppercase']")?.textContent.trim() || button.textContent.trim();
      const hasMetricDrilldown = (overviewDrilldowns[role] || []).some((item) => item.match.test(label));
      if (!hasMetricDrilldown) return;
      const target = overviewDrilldownRoute(role, label);
      button.dataset.drilldownRoute = target;
      button.dataset.drilldownLabel = label;
      if (!button.dataset.workflowHint) {
        button.dataset.workflowHint = "true";
        button.setAttribute("title", `Select ${label}. Open detail goes to ${target}.`);
      }
    });
  }

  function selectedRowTitle(row) {
    const cells = [...row.querySelectorAll("td")].map((cell) => cell.textContent.replace(/\s+/g, " ").trim());
    return cells[0] || routeWorkflowLabels[currentPath()] || "Selected item";
  }

  function renderWorkflowDetail(card, row) {
    let detail = card.querySelector(":scope > .workflow-detail-panel");
    if (!detail) {
      detail = document.createElement("div");
      detail.className = "workflow-detail-panel";
      card.appendChild(detail);
    }

    const path = currentPath();
    const title = selectedRowTitle(row);
    const actionLabel = routeWorkflowLabels[path] || "Drilldown";
    const role = activeRole();
    const route =
      path === "/branches"
        ? role === "COO"
          ? "/operations"
          : "/finance"
        : path === "/reports"
            ? "/reports"
            : path;

    detail.innerHTML = `
      <div class="workflow-detail-copy">
        <span>${escapeHtml(actionLabel)}</span>
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(appState.branch)} · ${escapeHtml(appState.timeframe)} · ${escapeHtml(appState.comparison)}</p>
      </div>
      <div class="workflow-detail-actions">
        <a href="${escapeHtml(activeRoleAwareUrl(route))}">${escapeHtml(actionLabel)}</a>
        <button type="button">Assign owner</button>
      </div>
    `;
  }

  function enhanceWorkflowTables() {
    if (currentPath() === "/overview") return;
    if (document.body.dataset.v2Foundation === "true") return;
    document.querySelectorAll("main table tbody tr").forEach((row) => {
      if (row.dataset.workflowRow === "true") return;
      row.dataset.workflowRow = "true";
      row.tabIndex = 0;
      row.addEventListener("click", (event) => {
        if (event.target.closest("a, button")) return;
        const card = row.closest(".rounded-2xl, section") || mainPageContainer();
        card?.querySelectorAll("tr[data-selected='true']").forEach((selected) => {
          selected.dataset.selected = "false";
        });
        row.dataset.selected = "true";
        renderWorkflowDetail(card, row);
      });
      row.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          row.click();
        }
      });
    });
  }

  function enhanceReportWorkflow() {
    if (currentPath() !== "/reports") return;
    document.querySelectorAll("main button").forEach((button) => {
      const text = button.textContent.replace(/\s+/g, " ").trim();
      if (!/generate|report/i.test(text) || button.dataset.reportWorkflow === "true") return;
      button.dataset.reportWorkflow = "true";
      button.addEventListener("click", () => {
        button.dataset.generated = "true";
        if (!button.querySelector(".workflow-report-status")) {
          button.insertAdjacentHTML("beforeend", `<span class="workflow-report-status">Ready to export</span>`);
        }
      });
    });
  }

  function enhanceSnapshotTables() {
    document.querySelectorAll("main .rounded-2xl.border.bg-surface").forEach((card) => {
      const title = findCardTitle(card)?.textContent.replace(/\s+/g, " ").trim() || "";
      const table = card.querySelector("table");
      if (!table) return;

      if (/branch performance snapshot/i.test(title)) {
        card.classList.add("branch-snapshot-card");
        table.classList.add("branch-snapshot-table");
      }
    });
  }

  function enhanceWorkflowActions() {
    enhanceOverviewDrilldowns();
    removeOverviewAttentionPanels();
    enhanceWorkflowTables();
    enhanceReportWorkflow();
    enhanceSnapshotTables();
    enhanceCeoOverviewStory();
  }

  function refreshInteractiveCharts() {
    if (renderCeoExecutiveOverview() || renderCooExecutiveOverview() || renderV2Foundation()) {
      disableChartMotion();
      return;
    }
    enhanceRevenueLens();
    enhanceFinanceDrilldown();
    markOverviewChartCards();
    if (currentPath() !== "/overview") {
      enhanceChartFurniture();
      enhanceChartVisuals();
      enhanceTooltipLabels();
    }
    enhanceWorkflowActions();
    disableChartMotion();
  }

  let observer;
  let scheduled = false;
  let revealTimer = null;
  let overviewRevealStartedAt = 0;
  let overviewBootSettled = false;
  let v2PendingDrillScrollLeft = null;
  const overviewRevealMaxWaitMs = 1800;

  function v2CaptureDrillScroll() {
    const canvas = document.querySelector(".v2-drill-canvas");
    if (!canvas) return;
    v2PendingDrillScrollLeft = canvas.scrollLeft;
  }

  function v2RestoreDrillScroll() {
    if (v2PendingDrillScrollLeft === null) return;
    const canvas = document.querySelector(".v2-drill-canvas");
    if (!canvas) return;
    const maxScroll = Math.max(0, canvas.scrollWidth - canvas.clientWidth);
    canvas.scrollLeft = Math.min(v2PendingDrillScrollLeft, maxScroll);
    v2PendingDrillScrollLeft = null;
  }

  function observeDocument() {
    if (!observer) return;
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  function runWithObserverPaused(callback) {
    if (observer) observer.disconnect();
    try {
      callback();
    } finally {
      observeDocument();
    }
  }

  function overviewRouteChunkLoaded() {
    if (currentPath() !== "/overview") return true;
    const entries = window.performance?.getEntriesByType?.("resource") || [];
    return entries.some((entry) => /\/assets\/overview-[^/]+\.js(?:\?|$)/.test(entry.name) && entry.responseEnd > 0);
  }

  function overviewReadyToReveal() {
    if (currentPath() !== "/overview") return true;

    if (!overviewRevealStartedAt) overviewRevealStartedAt = Date.now();
    if (Date.now() - overviewRevealStartedAt > overviewRevealMaxWaitMs) return true;

    const role = activeRole();

    return document.readyState === "complete" && overviewRouteChunkLoaded() && overviewTitleReady(role);
  }

  function setEnhancedUiVisible() {
    if (revealTimer) {
      clearTimeout(revealTimer);
      revealTimer = null;
    }
    overviewRevealStartedAt = 0;
    if (currentPath() === "/overview") overviewBootSettled = true;
    delete document.documentElement.dataset.zyephrEnhancing;
    document.documentElement.dataset.zyephrEnhanced = "true";
  }

  function revealEnhancedUi() {
    if (currentPath() !== "/overview") {
      setEnhancedUiVisible();
      return;
    }

    if (overviewBootSettled) {
      setEnhancedUiVisible();
      return;
    }

    if (overviewReadyToReveal()) {
      setEnhancedUiVisible();
      return;
    }

    document.documentElement.dataset.zyephrEnhancing = "true";
    if (revealTimer) clearTimeout(revealTimer);

    const waitForOverview = () => {
      if (!overviewReadyToReveal()) {
        revealTimer = window.setTimeout(waitForOverview, 40);
        return;
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (overviewReadyToReveal()) {
            setEnhancedUiVisible();
          } else {
            revealTimer = window.setTimeout(waitForOverview, 40);
          }
        });
      });
    };

    waitForOverview();
  }

  function scheduleEnhance() {
    if (currentPath() === "/overview" && !overviewBootSettled && !overviewReadyToReveal()) {
      document.documentElement.dataset.zyephrEnhancing = "true";
    }
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      if (enforceRouteAccess()) return;
      try {
        runWithObserverPaused(() => {
          enhanceBranding();
          enhanceRoleShell();
          normalizeSubpageIntro();
          normalizeSubpageLayout();
          enhanceGlobalControls();
          syncOverviewRoleView();
          const renderedV2 = renderCeoExecutiveOverview() || renderCooExecutiveOverview() || renderV2Foundation();
          if (renderedV2) {
            requestAnimationFrame(() => {
              v2RestoreDrillScroll();
              drawV2DrillConnectors();
            });
          }
          if (!renderedV2) {
            enhanceTrendCards();
            if (currentPath() !== "/overview") {
              enhanceChartVisuals();
              enhanceChartFurniture();
              enhanceTooltipLabels();
            }
            enhanceRevenueLens();
            enhanceFinanceDrilldown();
            markOverviewChartCards();
            enhanceWorkflowActions();
          }
          normalizeNotificationUi();
          normalizeDashboardLinkActions();
          disableChartMotion();
        });
      } finally {
        revealEnhancedUi();
      }
    });
  }

  function startEnhancementLayer() {
    if (observer) return;
    scheduleEnhance();
    window.addEventListener("popstate", scheduleEnhance);
    window.addEventListener("load", scheduleEnhance, { once: true });
    window.addEventListener("resize", () => requestAnimationFrame(drawV2DrillConnectors));
    document.addEventListener("click", (event) => {
      const personaLink = event.target.closest?.("a[data-persona-nav]");
      if (personaLink && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
        const target = new URL(personaLink.getAttribute("href"), window.location.origin);
        if (target.origin === window.location.origin && !(target.pathname === "/overview" && currentPath() !== "/overview")) {
          event.preventDefault();
          if (target.pathname === "/hrms" && currentPath() !== "/hrms") {
            window.location.assign(urlString(target));
            return;
          }
          const targetRole = normalizeRole(target.searchParams.get("role"));
          if (targetRole) persistRole(targetRole);
          if (targetRole) trustPersonaNavigation(target, targetRole);
          window.history.pushState({}, "", urlString(target));
          scheduleEnhance();
        }
      }
      const driverCarouselButton = event.target.closest?.("[data-ceo-driver-prev], [data-ceo-driver-next]");
      if (driverCarouselButton) {
        event.preventDefault();
        const carousel = driverCarouselButton.closest("[data-ceo-driver-carousel]");
        const slides = [...(carousel?.querySelectorAll("[data-ceo-driver-slide]") || [])];
        if (!slides.length) return;
        const activeIndex = Math.max(0, slides.findIndex((slide) => !slide.hidden));
        const direction = driverCarouselButton.matches("[data-ceo-driver-prev]") ? -1 : 1;
        const nextIndex = (activeIndex + direction + slides.length) % slides.length;
        const title = carousel.querySelector("[data-ceo-driver-title]");
        const index = carousel.querySelector("[data-ceo-driver-index]");
        slides.forEach((slide, slideIndex) => {
          const active = slideIndex === nextIndex;
          slide.classList.toggle("is-active", active);
          slide.hidden = !active;
        });
        if (title) title.textContent = slides[nextIndex].dataset.ceoDriverLabel || "Revenue drivers";
        if (index) index.textContent = String(nextIndex + 1);
        return;
      }
      const ceoRange = event.target.closest?.("[data-ceo-range]");
      if (ceoRange) {
        event.preventDefault();
        const group = ceoRange.closest(".ceo-scan-range");
        const card = ceoRange.closest(".ceo-scan-card");
        const title = card?.querySelector(".ceo-scan-card-head span")?.textContent?.replace(/\s+/g, " ").trim();
        if (title) {
          ceoOverviewChartRanges[ceoChartKey(title, 0)] = ceoRange.dataset.ceoRange || defaultRange;
          if (refreshCeoTrendCard(card)) return;
        }
        group?.querySelectorAll("[data-ceo-range]").forEach((button) => {
          button.classList.toggle("is-active", button === ceoRange);
          button.setAttribute("aria-pressed", String(button === ceoRange));
        });
        const container = mainPageContainer();
        if (container) {
          delete container.dataset.ceoExecutiveOverview;
          delete container.dataset.cooExecutiveOverview;
        }
        scheduleEnhance();
        return;
      }
      closeControlMenus();
      closeRoleProfileMenu();
      setTimeout(scheduleEnhance, 0);
    }, true);
    observer = new MutationObserver(scheduleEnhance);
    observeDocument();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startEnhancementLayer, { once: true });
  } else {
    startEnhancementLayer();
  }
})();
