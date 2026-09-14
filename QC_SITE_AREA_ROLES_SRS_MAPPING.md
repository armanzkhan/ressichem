# QC Site Area Roles - SRS Compliance Mapping

## 📋 SRS User Classes (Section 2.2)

According to the QC Site Area SRS, the user classes are:

1. **Directors/Managers** - Full access
2. **R&D Chemist** - Input and analyze all data
3. **QC Analyst** - QC data input, batch testing
4. **Viewer** - Read-only dashboards

---

## 🔄 Role Mapping to System Roles

### SRS Role → System Role Mapping:

| SRS Role | Permission-Based Role | Three-Layer Role | Access Level |
|----------|---------------------|------------------|--------------|
| **Directors/Managers** | QC Manager or QC Admin | MANAGEMENT layer (PLANT_HEAD, CEO, DIRECTOR) | Full access to all modules |
| **R&D Chemist** | Custom R&D role | R&D layer (R&D_CHEMIST) | Input and analyze all R&D data |
| **QC Analyst** | QC Analyst | QC layer (QC_LAB_TECHNICIAN) | QC data input, batch testing |
| **Viewer** | QC Viewer | N/A (read-only) | Read-only dashboards |

---

## 🎯 Recommended Signup Options

For QC Site Area signup, users should be able to select:

1. **QC Analyst** (SRS: QC Analyst)
   - QC data input, batch testing
   - Can submit for approval
   - Cannot approve

2. **R&D Chemist** (SRS: R&D Chemist)
   - Input and analyze all R&D data
   - Access to R&D trials, formulations
   - Cannot see QC data

3. **QC Manager** (SRS: Directors/Managers)
   - Full access
   - Can approve results
   - Can manage users

4. **QC Viewer** (SRS: Viewer)
   - Read-only dashboards
   - Can export data
   - Cannot create/edit/approve

---

## ✅ SRS Compliance Requirements

The signup page must:
- ✅ Allow selection of SRS-defined user classes
- ✅ Set appropriate permissions based on role
- ✅ Set three-layer model profile for R&D Chemist
- ✅ Ensure proper access control based on role

