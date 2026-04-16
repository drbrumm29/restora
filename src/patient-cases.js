// Patient cases with real STL files in /public/patient-cases/
// Used by Dashboard → click patient → auto-loads files into Design Systems Bridge

export const PATIENTS = [
  {
    id: "carrie-pappas",
    name: "Carrie Pappas",
    initials: "CP",
    teeth: "#18, #19",
    type: "Implant Restoration",
    subtype: "Screw-retained crowns",
    status: "In progress",
    statusColor: "blue",
    route: "implant",
    system: "lab",
    age: 58,
    gender: "F",
    notes: "FMX 6/16/25 shows two integrated implants at #18 and #19 with existing crowns. Patient presents for crown replacement / evaluation. Scan date: 2026-04-08.",
    files: [
      { name: "upper_scan.beb",     slot: "upper", size: 14680064, subdir:"carrie" },
      { name: "lower_scan.beb",     slot: "lower", size: 14680064, subdir:"carrie" },
      { name: "fmx_radiograph.png", slot: "xray",  size: 319488,   subdir:"carrie" },
    ],
    // AI-analyzed tooth chart — derived from FMX radiograph
    toothChart: {
      implants:   [18, 19],
      missing:    [],
      restored:   [2, 3, 14, 15, 29, 30],  // teeth showing amalgam/composite on FMX
      endodontic: [],
      present:    [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,20,21,22,23,24,25,26,27,28,29,30,31,32],
    },
    xrayAnalysis: {
      date: "2026-04-08",
      type: "Full Mouth Series (FMX)",
      findings: [
        { severity: "info",     tooth: 18, note: "Implant fixture with existing crown — integrated, no peri-implant pathology visible" },
        { severity: "info",     tooth: 19, note: "Implant fixture with existing crown — integrated, no peri-implant pathology visible" },
        { severity: "info",     tooth: null, note: "Remaining dentition intact — restorations present in posterior segments" },
      ],
    },
  },
  {
    id: "sarah-johnson",
    name: "Sarah Johnson",
    initials: "SJ",
    teeth: "#8, #9",
    type: "Cosmetic Anterior",
    subtype: "Veneers",
    status: "Design ready",
    statusColor: "teal",
    route: "prep",       // design-bridge mode
    system: "mill",       // routes to Mill Connect
    age: 34,
    gender: "F",
    notes: "Discolored centrals, wants bright BL2 shade. AEP parameters: W:L 78%, consonant smile arc.",
    files: [
      { name: "sarah_johnson_upper_arch.stl", slot: "upper", size: 37888 },
      { name: "sarah_johnson_lower_arch.stl", slot: "lower", size: 37888 },
      { name: "sarah_johnson_prep_8.stl",     slot: "prep",  size: 9600  },
      { name: "sarah_johnson_prep_9.stl",     slot: "prep2", size: 9600  },
      { name: "sarah_johnson_bite_reg.stl",   slot: "bite",  size: 18944 },
    ],
  },
  {
    id: "michael-chen",
    name: "Michael Chen",
    initials: "MC",
    teeth: "#3",
    type: "Restorative Posterior",
    subtype: "Crown — Molar",
    status: "Files needed",
    statusColor: "warn",
    route: "prep",
    system: "mill",
    age: 52,
    gender: "M",
    notes: "Fractured cusp on maxillary 1st molar, needs full coverage zirconia crown. A2 shade match.",
    files: [
      { name: "michael_chen_upper_arch.stl", slot: "upper", size: 37888 },
      { name: "michael_chen_lower_arch.stl", slot: "lower", size: 37888 },
      { name: "michael_chen_prep_3.stl",     slot: "prep",  size: 12000 },
      { name: "michael_chen_bite_reg.stl",   slot: "bite",  size: 18944 },
    ],
  },
  {
    id: "emma-davis",
    name: "Emma Davis",
    initials: "ED",
    teeth: "#30",
    type: "Single Implant",
    subtype: "Crown — Scan body",
    status: "In progress",
    statusColor: "blue",
    route: "implant",
    system: "lab",
    age: 46,
    gender: "F",
    notes: "Straumann BLT 4.1×10mm placed 12 wks prior. Scan body in place. A3 shade, custom abutment.",
    files: [
      { name: "emma_davis_upper_arch.stl",    slot: "upper", size: 37888 },
      { name: "emma_davis_lower_arch.stl",    slot: "lower", size: 37888 },
      { name: "emma_davis_scanbody.stl",      slot: "crown", size: 5000  },
      { name: "emma_davis_implant_crown.stl", slot: "crown", size: 12000 },
      { name: "emma_davis_bite_reg.stl",      slot: "bite",  size: 18944 },
    ],
  },
  {
    id: "david-martinez",
    name: "David Martinez",
    initials: "DM",
    teeth: "#7-#10",
    type: "Smile Makeover",
    subtype: "Anterior 4 Veneers",
    status: "Design ready",
    statusColor: "teal",
    route: "prep",
    system: "lab",
    age: 29,
    gender: "M",
    notes: "Full smile makeover: laterals & centrals. Target BL1 shade. Square-tapering form. W:L 80%.",
    files: [
      { name: "david_martinez_upper_arch.stl", slot: "upper", size: 37888 },
      { name: "david_martinez_lower_arch.stl", slot: "lower", size: 37888 },
      { name: "david_martinez_prep_7.stl",     slot: "prep",  size: 9600  },
      { name: "david_martinez_prep_8.stl",     slot: "prep2", size: 9600  },
      { name: "david_martinez_prep_9.stl",     slot: "prep",  size: 9600  },
      { name: "david_martinez_prep_10.stl",    slot: "prep2", size: 9600  },
      { name: "david_martinez_bite_reg.stl",   slot: "bite",  size: 18944 },
    ],
  },
];

// Load patient files as File objects for upload to Design Bridge
export async function loadPatientFiles(patient) {
  const filesPromises = patient.files.map(async (f) => {
    const path = f.subdir ? `/patient-cases/${f.subdir}/${f.name}` : `/patient-cases/${f.name}`;
    const response = await fetch(path);
    const blob = await response.blob();
    const ext = f.name.split('.').pop().toLowerCase();
    const mime = ext==='png'||ext==='jpg'||ext==='jpeg' ? `image/${ext==='jpg'?'jpeg':ext}` :
                 ext==='stl' ? 'model/stl' :
                 ext==='beb' ? 'application/octet-stream' : 'application/octet-stream';
    return new File([blob], f.name, { type: mime, lastModified: Date.now() });
  });
  return Promise.all(filesPromises);
}
