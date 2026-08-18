import { DataSource, IsNull } from 'typeorm';
import {
  TenantEntity,
  SiteEntity,
  OrganizationUnitEntity,
  WarehouseEntity,
  WarehouseLocationEntity,
  MaterialEntity,
  MaterialInventoryEntity,
  InventoryTransactionEntity,
  UserEntity,
} from '../entities';

export async function seedInventoryDemo(
  dataSource: DataSource,
  tenant: TenantEntity,
): Promise<void> {
  const siteRepository = dataSource.getRepository(SiteEntity);
  const orgUnitRepository = dataSource.getRepository(OrganizationUnitEntity);
  const warehouseRepository = dataSource.getRepository(WarehouseEntity);
  const locationRepository = dataSource.getRepository(WarehouseLocationEntity);
  const materialRepository = dataSource.getRepository(MaterialEntity);
  const inventoryRepository = dataSource.getRepository(MaterialInventoryEntity);
  const transactionRepository = dataSource.getRepository(InventoryTransactionEntity);
  const userRepository = dataSource.getRepository(UserEntity);

  const adminUser = await userRepository.findOne({
    where: { isPlatformAdmin: true },
  });

  // =========================================================================
  // 1. ĐỒNG BỘ 3 NHÀ MÁY THUỘC CÔNG TY MẸ (SITES & ORGANIZATION UNITS)
  // =========================================================================
  const plantUnitsData = [
    {
      code: 'NM_THUYDIEN_DKR',
      name: 'Nhà máy Thủy điện Sông Ba (HPP - 120MW)',
      type: 'plant',
      parentCode: 'BTGD_SBA',
      sortOrder: 61,
      siteCode: 'HPP_SITE_01',
      siteName: 'Khu liên hợp Thủy điện Sông Ba (HPP)',
      plantType: 'HYDRO',
    },
    {
      code: 'NM_DIENGIO_DKR',
      name: 'Nhà máy Điện gió Hướng Linh (WPP - 100MW)',
      type: 'plant',
      parentCode: 'BTGD_SBA',
      sortOrder: 62,
      siteCode: 'WPP_SITE_01',
      siteName: 'Trang trại Điện gió Hướng Linh (WPP)',
      plantType: 'WIND',
    },
    {
      code: 'NM_DIENMT_DKR',
      name: 'Nhà máy Điện mặt trời Chư Ngọc (SPP - 50MWp)',
      type: 'plant',
      parentCode: 'BTGD_SBA',
      sortOrder: 63,
      siteCode: 'SPP_SITE_01',
      siteName: 'Cánh đồng Điện mặt trời Chư Ngọc (SPP)',
      plantType: 'SOLAR',
    },
  ];

  const orgUnitMap = new Map<string, OrganizationUnitEntity>();

  // Tìm parent BTGD_SBA nếu có
  const parentUnit = await orgUnitRepository.findOne({
    where: { tenantId: tenant.id, code: 'BTGD_SBA' },
  });

  for (const p of plantUnitsData) {
    // 1.1 Tạo hoặc cập nhật Organization Unit
    let unit = await orgUnitRepository.findOne({
      where: { tenantId: tenant.id, code: p.code },
    });
    if (!unit) {
      unit = orgUnitRepository.create({
        tenantId: tenant.id,
        code: p.code,
      });
    }
    unit.name = p.name;
    unit.type = p.type;
    unit.parentId = parentUnit ? parentUnit.id : null;
    unit.sortOrder = p.sortOrder;
    unit.isActive = true;
    unit.metadata = { plantType: p.plantType, demo: true };
    unit = await orgUnitRepository.save(unit);
    orgUnitMap.set(p.code, unit);

    // 1.2 Tạo hoặc cập nhật Site
    let site = await siteRepository.findOne({
      where: { tenantId: tenant.id, code: p.siteCode },
    });
    if (!site) {
      site = siteRepository.create({
        tenantId: tenant.id,
        code: p.siteCode,
      });
    }
    site.name = p.siteName;
    site.type = p.plantType;
    site.isActive = true;
    site.metadata = { unitId: unit.id, plantType: p.plantType };
    await siteRepository.save(site);
  }

  // =========================================================================
  // 2. KHỞI TẠO DANH MỤC NHÀ KHO (WAREHOUSES) THEO CẤU TRÚC 4 CẤP
  // =========================================================================
  // Gồm: Tổng kho trung tâm công ty mẹ + 3 Nhà máy (Kho chính, Kho phân xưởng, Kho ca trực)
  const warehouseDefinitions = [
    // 2.1 CÔNG TY MẸ
    {
      code: 'WH_CENTRAL_HUB',
      name: 'Tổng kho Chiến lược Công ty Mẹ (Central Hub)',
      orgUnitCode: 'BTGD_SBA',
      location: 'Khu liên hợp Năng lượng Trung tâm, TP. Đà Nẵng',
    },
    // 2.2 NHÀ MÁY THỦY ĐIỆN
    {
      code: 'WH_HPP_MAIN',
      name: 'Tổng kho Trung tâm Nhà máy Thủy điện (HPP Main)',
      orgUnitCode: 'NM_THUYDIEN_DKR',
      location: 'Khu gian máy chính & Trạm biến áp 110kV Thủy điện',
    },
    {
      code: 'WH_HPP_WORKSHOP',
      name: 'Kho Phân xưởng Cơ điện & Gian máy Tổ H1-H2',
      orgUnitCode: 'NM_THUYDIEN_DKR',
      location: 'Tầng cao trình 12.5m - Nhà máy Thủy điện',
    },
    {
      code: 'WH_HPP_SHIFT',
      name: 'Kho Ca trực Vận hành & Phụ tùng Nhanh Thủy điện',
      orgUnitCode: 'NM_THUYDIEN_DKR',
      location: 'Phòng trực ca Vận hành Trung tâm OCC - HPP',
    },
    // 2.3 NHÀ MÁY ĐIỆN GIÓ
    {
      code: 'WH_WPP_MAIN',
      name: 'Tổng kho Trung tâm Nhà máy Điện gió (WPP Main)',
      orgUnitCode: 'NM_DIENGIO_DKR',
      location: 'Tòa nhà điều hành & Trạm biến áp 110kV Điện gió',
    },
    {
      code: 'WH_WPP_TURBINE',
      name: 'Kho Vật tư Cơ điện & Phụ tùng Tuabin Gió (WTG Spares)',
      orgUnitCode: 'NM_DIENGIO_DKR',
      location: 'Nhà kho kỹ thuật trạm bảo trì Tuabin gió Vestas',
    },
    {
      code: 'WH_WPP_SHIFT',
      name: 'Kho Ca trực Đội Bảo trì Hiện trường Điện gió',
      orgUnitCode: 'NM_DIENGIO_DKR',
      location: 'Trạm lưu động tổ phản ứng nhanh - Khu tuabin WTG-01',
    },
    // 2.4 NHÀ MÁY ĐIỆN MẶT TRỜI
    {
      code: 'WH_SPP_MAIN',
      name: 'Tổng kho Trung tâm Nhà máy Điện mặt trời (SPP Main)',
      orgUnitCode: 'NM_DIENMT_DKR',
      location: 'Khu Nhà điều hành & Trạm biến áp nâng áp 22/110kV SPP',
    },
    {
      code: 'WH_SPP_FIELD',
      name: 'Kho Vật tư Nông trường Pin & Khung giá Tracker',
      orgUnitCode: 'NM_DIENMT_DKR',
      location: 'Nhà tiền chế Block Inverter trung tâm Inverter Station 01',
    },
    {
      code: 'WH_SPP_SHIFT',
      name: 'Kho Ca trực Vận hành & Thiết bị Vệ sinh Pin Solar',
      orgUnitCode: 'NM_DIENMT_DKR',
      location: 'Phòng thường trực đội bảo dưỡng & robot rửa pin SPP',
    },
  ];

  const warehouseMap = new Map<string, WarehouseEntity>();

  for (const wDef of warehouseDefinitions) {
    let orgUnitId: string | null = null;
    if (wDef.orgUnitCode) {
      const u = orgUnitMap.get(wDef.orgUnitCode) || (await orgUnitRepository.findOne({
        where: { tenantId: tenant.id, code: wDef.orgUnitCode },
      }));
      if (u) orgUnitId = u.id;
    }

    let wh = await warehouseRepository.findOne({
      where: { tenantId: tenant.id, code: wDef.code },
    });
    if (!wh) {
      wh = warehouseRepository.create({
        tenantId: tenant.id,
        code: wDef.code,
      });
    }
    wh.name = wDef.name;
    wh.location = wDef.location;
    wh.orgUnitId = orgUnitId;
    wh.managerUserId = adminUser ? adminUser.id : null;
    wh.isActive = true;
    wh = await warehouseRepository.save(wh);
    warehouseMap.set(wDef.code, wh);
  }

  // =========================================================================
  // 3. KHỞI TẠO VỊ TRÍ KHO (WAREHOUSE LOCATIONS / RACKS / SHELVES / BINS)
  // =========================================================================
  const locationDefinitions = [
    // --- 3.1 Vị trí tại Tổng kho Chiến lược Công ty Mẹ ---
    { whCode: 'WH_CENTRAL_HUB', code: 'HUB-STRAT-A1-BIN01', name: 'Khu Chiến lược - Kệ A1 - Ngăn 01', description: 'Chứa máy biến áp, máy cắt SF6, dao cách ly 110kV' },
    { whCode: 'WH_CENTRAL_HUB', code: 'HUB-STRAT-A2-BIN01', name: 'Khu Chiến lược - Kệ A2 - Ngăn 01', description: 'Chứa rơ-le số bảo vệ SEL/ABB & Thiết bị Scada' },
    { whCode: 'WH_CENTRAL_HUB', code: 'HUB-OIL-Z01', name: 'Khu Hóa chất & Dầu Cách điện Trung tâm', description: 'Chứa dầu máy biến áp Transformer Shell Diala phuy 200L' },
    { whCode: 'WH_CENTRAL_HUB', code: 'HUB-HSE-R01-BIN01', name: 'Tủ Thiết bị An toàn & BHLĐ Chiến lược', description: 'Găng cách điện 22kV/110kV, Máy đo Megomet 5kV' },

    // --- 3.2 Vị trí tại Nhà máy Thủy điện ---
    { whCode: 'WH_HPP_MAIN', code: 'HPP-MECH-R01-S01', name: 'Kệ Cơ khí - Tầng 1 - Ngăn 01 (HPP)', description: 'Chứa vòng bi trục chính, gối đỡ tuabin SKF' },
    { whCode: 'WH_HPP_MAIN', code: 'HPP-MECH-R01-S02', name: 'Kệ Cơ khí - Tầng 1 - Ngăn 02 (HPP)', description: 'Chứa bộ phớt làm kín tuabin Klingersil C-4400' },
    { whCode: 'WH_HPP_MAIN', code: 'HPP-ELEC-T01-BIN01', name: 'Tủ Điện & Tự động hóa - Ngăn 01', description: 'Chứa contactor Siemens, PLC điều tốc Governor, rơ-le trung gian' },
    { whCode: 'WH_HPP_MAIN', code: 'HPP-OIL-Z01', name: 'Khu Lưu trữ Dầu Thủy lực Điều tốc', description: 'Chứa dầu thủy lực Shell Tellus S2 V46' },
    { whCode: 'WH_HPP_WORKSHOP', code: 'HPP-WS-RACK-A1', name: 'Kệ Phân xưởng - Giá cơ khí A1', description: 'Bu-lông cường độ cao M16, gioăng cao su, que hàn chịu lực' },
    { whCode: 'WH_HPP_WORKSHOP', code: 'HPP-WS-CAB-E1', name: 'Tủ Phụ trợ Điện Phân xưởng E1', description: 'Chổi than máy phát Morgan, cầu chì, bộ nguồn 24VDC' },
    { whCode: 'WH_HPP_SHIFT', code: 'HPP-SH-TOOL-BOX01', name: 'Hộp Dụng cụ Cầm tay Ca trực Thủy điện', description: 'Bộ tuýp, kìm, tua vít, đồng hồ vạn năng Fluke' },
    { whCode: 'WH_HPP_SHIFT', code: 'HPP-SH-CONS-BIN01', name: 'Ngăn Vật tư Tiêu hao Ca trực HPP', description: 'Bóng đèn LED, băng keo cách điện 3M, giẻ lau công nghiệp' },

    // --- 3.3 Vị trí tại Nhà máy Điện gió ---
    { whCode: 'WH_WPP_MAIN', code: 'WPP-NAC-R01-BIN01', name: 'Kệ Phụ tùng Nacelle & Hộp số', description: 'Vòng bi tốc độ cao SKF, lõi lọc dầu hộp số gió' },
    { whCode: 'WH_WPP_MAIN', code: 'WPP-PCH-R02-BIN01', name: 'Kệ Phụ tùng Pitch & Hub Quạt gió', description: 'Động cơ Pitch Motor 400V, cụm ắc quy dự phòng 24V' },
    { whCode: 'WH_WPP_MAIN', code: 'WPP-YAW-R03-BIN01', name: 'Kệ Phụ tùng Yaw & Khí tượng', description: 'Động cơ Yaw Bonfiglioli, Cảm biến gió Anemometer siêu âm' },
    { whCode: 'WH_WPP_MAIN', code: 'WPP-OIL-Z01', name: 'Khu Dầu Nhớt Tổng hợp Hộp số Gió', description: 'Dầu hộp số tổng hợp Mobilgear SHC XMP 320' },
    { whCode: 'WH_WPP_TURBINE', code: 'WPP-TB-RESIN-BIN01', name: 'Ngăn Keo Sợi Thủy tinh Vá Cánh', description: 'Bộ keo Epoxy & sợi thủy tinh sửa chữa Blade Resin' },
    { whCode: 'WH_WPP_TURBINE', code: 'WPP-TB-BOLT-BIN02', name: 'Ngăn Bu-lông Trụ & Cánh Tuabin M24/M30', description: 'Bu-lông cường độ cao 10.9 liên kết đốt tháp và cánh' },
    { whCode: 'WH_WPP_SHIFT', code: 'WPP-SH-HARNESS-01', name: 'Kệ Dây đai An toàn & Dụng cụ Leo trụ', description: 'Dây đai an toàn chống rơi Petzl, khóa trượt ray an toàn' },
    { whCode: 'WH_WPP_SHIFT', code: 'WPP-SH-TOOL-BOX01', name: 'Tủ Dụng cụ Cứu hộ & Sửa chữa Khẩn cấp WTG', description: 'Cờ lê lực thủy lực, bộ đàm chống cháy nổ' },

    // --- 3.4 Vị trí tại Nhà máy Điện mặt trời ---
    { whCode: 'WH_SPP_MAIN', code: 'SPP-INV-R01-BIN01', name: 'Kệ Biến tần & Module Công suất Inverter', description: 'Khối công suất IGBT Sungrow/Huawei, Quạt tản nhiệt Inverter' },
    { whCode: 'WH_SPP_MAIN', code: 'SPP-PV-Z01-RACK01', name: 'Khu Lưu trữ Tấm pin PV Module Dự phòng', description: 'Tấm pin Mono Perc 550W Jinko/Longi pallet bảo quản' },
    { whCode: 'WH_SPP_MAIN', code: 'SPP-ELEC-R02-BIN01', name: 'Tủ Cáp & Phụ kiện Đấu nối DC/AC', description: 'Cáp DC Solar 1x6mm², Đầu nối MC4 1500V, Cầu chì gPV 1500V' },
    { whCode: 'WH_SPP_FIELD', code: 'SPP-FLD-TRACK-R01', name: 'Kệ Phụ tùng Khung giàn Tracker Solar', description: 'Động cơ Tracker Solar, Cảm biến góc nghiêng, Vòng bi tự bôi trơn' },
    { whCode: 'WH_SPP_FIELD', code: 'SPP-FLD-CB-BIN02', name: 'Tủ Phụ kiện Tủ Gom Combiner Box', description: 'Chống sét lan truyền DC SPD 1500V, Cầu dao DC cách ly' },
    { whCode: 'WH_SPP_SHIFT', code: 'SPP-SH-ROBOT-01', name: 'Khu Bảo dưỡng Robot & Chổi Rửa Pin', description: 'Chổi cước chuyên dụng, Pin robot vệ sinh Solar, Bơm áp lực cao' },
    { whCode: 'WH_SPP_SHIFT', code: 'SPP-SH-TEST-01', name: 'Tủ Thiết bị Đo kiểm Ca trực SPP', description: 'Camera nhiệt Fluke kiểm tra Hotspot tấm pin, Máy đo I-V curve' },
  ];

  const locationMap = new Map<string, WarehouseLocationEntity>();

  for (const locDef of locationDefinitions) {
    const wh = warehouseMap.get(locDef.whCode);
    if (!wh) continue;

    let loc = await locationRepository.findOne({
      where: { warehouseId: wh.id, code: locDef.code },
    });
    if (!loc) {
      loc = locationRepository.create({
        warehouseId: wh.id,
        code: locDef.code,
      });
    }
    loc.name = locDef.name;
    loc.description = locDef.description;
    loc = await locationRepository.save(loc);
    locationMap.set(`${locDef.whCode}:${locDef.code}`, loc);
  }

  // =========================================================================
  // 4. KHỞI TẠO DANH MỤC VẬT TƯ CHUẨN HÓA (MATERIAL MASTER DATA)
  // =========================================================================
  const materialDefinitions = [
    // --- 4.1 VẬT TƯ THỦY ĐIỆN (HPP) ---
    {
      code: 'VT-HPP-BRG-SKF6208',
      name: 'Vòng bi trục chính tuabin SKF 6208-2Z',
      category: 'SPARE_PART',
      unit: 'Cái',
      specifications: 'Đường kính trục d=40mm, D=80mm, B=18mm, nắp chặn kim loại chịu nhiệt',
      manufacturer: 'SKF (Thụy Điển)',
      minStock: 2,
      maxStock: 10,
    },
    {
      code: 'VT-HPP-SEAL-C4400',
      name: 'Bộ phớt làm kín nước tuabin Klingersil C-4400',
      category: 'SPARE_PART',
      unit: 'Bộ',
      specifications: 'Chất liệu Aramid kết hợp cao su NBR, chịu áp 100 bar, nhiệt độ tới 400°C',
      manufacturer: 'Klinger (Đức)',
      minStock: 2,
      maxStock: 6,
    },
    {
      code: 'VT-HPP-OIL-HYD46',
      name: 'Dầu thủy lực điều tốc Shell Tellus S2 V46 (209L)',
      category: 'CONSUMABLE',
      unit: 'Phuy',
      specifications: 'Độ nhớt ISO VG 46, chỉ số độ nhớt VI>140, chống mài mòn cao áp',
      manufacturer: 'Shell',
      minStock: 4,
      maxStock: 12,
    },
    {
      code: 'VT-HPP-BRUSH-GEN',
      name: 'Chổi than máy phát điện thủy điện (Carbon Brush)',
      category: 'SPARE_PART',
      unit: 'Bộ',
      specifications: 'Kích thước 25x32x64mm, chất liệu Than chì điện giải Morgan NCC634',
      manufacturer: 'Morgan Advanced Materials',
      minStock: 10,
      maxStock: 50,
    },
    {
      code: 'VT-HPP-GOV-PLC',
      name: 'Khối điều khiển kỹ thuật số Điều tốc Thủy điện (Governor Controller)',
      category: 'SPARE_PART',
      unit: 'Bộ',
      specifications: 'CPU Modicon M580 Schneider tích hợp module PID điều tốc 0.01% Freq',
      manufacturer: 'Schneider Electric',
      minStock: 1,
      maxStock: 2,
    },
    {
      code: 'VT-HPP-FILTER-OIL',
      name: 'Bộ lõi lọc dầu thủy lực áp suất cao OF-001 (10 micron)',
      category: 'CONSUMABLE',
      unit: 'Cái',
      specifications: 'Lõi sợi thủy tinh xếp nếp Hydac 0330D010BN4HC, chịu áp 210 bar',
      manufacturer: 'Hydac (Đức)',
      minStock: 5,
      maxStock: 20,
    },

    // --- 4.2 VẬT TƯ ĐIỆN GIÓ (WPP) ---
    {
      code: 'VT-WPP-BRG-GBX',
      name: 'Vòng bi trục tốc độ cao hộp số Tuabin gió (Gearbox Bearing)',
      category: 'SPARE_PART',
      unit: 'Cái',
      specifications: 'Vòng bi đũa côn FAG/SKF chịu tải động cao đặc chủng hộp số tuabin 4MW',
      manufacturer: 'FAG Schaeffler / SKF',
      minStock: 2,
      maxStock: 5,
    },
    {
      code: 'VT-WPP-OIL-MOBIL320',
      name: 'Dầu bôi trơn tổng hợp hộp số gió Mobilgear SHC XMP 320 (208L)',
      category: 'CONSUMABLE',
      unit: 'Phuy',
      specifications: 'Gốc PAO tổng hợp ISO VG 320, chống rỗ bề mặt vi mô (Micropitting)',
      manufacturer: 'Mobil / ExxonMobil',
      minStock: 5,
      maxStock: 15,
    },
    {
      code: 'VT-WPP-MTR-PITCH',
      name: 'Động cơ xoay bước cánh tuabin Pitch Motor 400V 7.5kW',
      category: 'SPARE_PART',
      unit: 'Cái',
      specifications: 'Động cơ Servo xoay chiều tích hợp phanh từ và encoder độ phân giải cao',
      manufacturer: 'Vestas / KEBA',
      minStock: 1,
      maxStock: 4,
    },
    {
      code: 'VT-WPP-MTR-YAW',
      name: 'Động cơ xoay hướng gió Yaw Motor & Hộp giảm tốc Yaw Drive',
      category: 'SPARE_PART',
      unit: 'Cái',
      specifications: 'Hộp số hành tinh nhiều cấp tích hợp motor 5.5kW IP65 chịu thời tiết khắc nghiệt',
      manufacturer: 'Bonfiglioli (Ý)',
      minStock: 2,
      maxStock: 6,
    },
    {
      code: 'VT-WPP-SEN-ANEMO',
      name: 'Cảm biến siêu âm đo tốc độ & hướng gió Ultrasonic Anemometer',
      category: 'SPARE_PART',
      unit: 'Cái',
      specifications: 'Dải đo 0-75m/s, gia nhiệt sấy chống đóng băng 24V, ngõ ra RS485 Modbus',
      manufacturer: 'Thies Clima (Đức)',
      minStock: 2,
      maxStock: 5,
    },
    {
      code: 'VT-WPP-RESIN-BLADE',
      name: 'Bộ keo Epoxy & sợi Carbon sửa chữa cánh quạt tuabin Blade Resin (20kg)',
      category: 'CONSUMABLE',
      unit: 'Bộ',
      specifications: 'Hệ keo Epoxy đóng rắn nhanh Sikadur/Gurit chuyên dùng sửa nứt cánh tuabin',
      manufacturer: 'Gurit / Sika',
      minStock: 3,
      maxStock: 10,
    },
    {
      code: 'VT-WPP-BAT-PITCH',
      name: 'Bộ ắc quy khô chì-axit dự phòng hệ Pitch 24V-100Ah',
      category: 'SPARE_PART',
      unit: 'Bình',
      specifications: 'Ắc quy AGM chịu xả sâu chu kỳ cao, tiêu chuẩn khẩn cấp tuabin gió',
      manufacturer: 'Vision / Enersys',
      minStock: 6,
      maxStock: 24,
    },

    // --- 4.3 VẬT TƯ ĐIỆN MẶT TRỜI (SPP) ---
    {
      code: 'VT-SPP-PV-550W',
      name: 'Tấm pin năng lượng mặt trời Mono Perc 550W Jinko Tiger Pro',
      category: 'SPARE_PART',
      unit: 'Tấm',
      specifications: 'Hiệu suất 21.3%, kính cường lực chống chói 3.2mm, khung nhôm Anodized chịu gió bão',
      manufacturer: 'Jinko Solar / Longi',
      minStock: 10,
      maxStock: 50,
    },
    {
      code: 'VT-SPP-MC4-CONN',
      name: 'Bộ đầu nối cáp năng lượng mặt trời MC4 Stäubli Evo2 1500V',
      category: 'CONSUMABLE',
      unit: 'Cặp',
      specifications: 'Điện áp 1500VDC, dòng định mức 45A, chống nước IP68 đạt chuẩn TUV/UL',
      manufacturer: 'Stäubli (Thụy Sĩ)',
      minStock: 100,
      maxStock: 500,
    },
    {
      code: 'VT-SPP-FUSE-DC1500',
      name: 'Cầu chì DC chuyên dụng Solar gPV 1500VDC 20A Bussmann',
      category: 'CONSUMABLE',
      unit: 'Cái',
      specifications: 'Kích thước 10x85mm, dòng cắt 20kA, bảo vệ chuỗi String PV',
      manufacturer: 'Eaton Bussmann',
      minStock: 30,
      maxStock: 100,
    },
    {
      code: 'VT-SPP-IGBT-MOD',
      name: 'Khối Module công suất IGBT Biến tần Inverter Sungrow SG250HX',
      category: 'SPARE_PART',
      unit: 'Cái',
      specifications: 'Điện áp 1700V/600A Infineon PrimePACK tích hợp cảm biến NTC',
      manufacturer: 'Infineon / Sungrow',
      minStock: 2,
      maxStock: 8,
    },
    {
      code: 'VT-SPP-FAN-INV',
      name: 'Quạt làm mát cưỡng bức Biến tần Solar Inverter 24VDC 3.5A',
      category: 'SPARE_PART',
      unit: 'Cái',
      specifications: 'Đường kính 280mm, lưu lượng 1200 CFM, tiêu chuẩn ngoài trời IP65',
      manufacturer: 'Ebm-papst (Đức)',
      minStock: 4,
      maxStock: 16,
    },
    {
      code: 'VT-SPP-CABLE-DC6',
      name: 'Cáp điện năng lượng mặt trời DC Solar Cable 1x6mm² (Cuộn 500m)',
      category: 'CONSUMABLE',
      unit: 'Mét',
      specifications: 'Ruột đồng mạ thiếc mềm dẻo, vỏ bọc XLPO kép chịu bức xạ UV & nhiệt 120°C',
      manufacturer: 'Cadivi / Leader Solar',
      minStock: 200,
      maxStock: 1000,
    },
    {
      code: 'VT-SPP-CLEAN-ROBOT',
      name: 'Chổi cước sợi mềm chuyên dụng cho Robot vệ sinh Pin Solar',
      category: 'CONSUMABLE',
      unit: 'Bộ',
      specifications: 'Sợi cước mềm Microfiber chống xước bề mặt kính AR, chiều dài 1.2m',
      manufacturer: 'Ecoppia / SunBrush',
      minStock: 4,
      maxStock: 10,
    },

    // --- 4.4 VẬT TƯ CHIẾN LƯỢC CÔNG TY MẸ (TRẠM 110KV & ĐO KIỂM) ---
    {
      code: 'VT-HUB-TRF-110KV',
      name: 'Máy biến áp chính 110/22kV 63MVA ngâm dầu Thibidi',
      category: 'SPARE_PART',
      unit: 'Máy',
      specifications: 'Tổ đấu dây Ynd11, bộ điều áp dưới tải OLTC MR Reinhausen, bảo vệ rơ-le Buchholz',
      manufacturer: 'Thibidi / ABB',
      minStock: 1,
      maxStock: 2,
    },
    {
      code: 'VT-HUB-CB-SF6',
      name: 'Máy cắt khí SF6 110kV ngoài trời ABB LTB 145D1',
      category: 'SPARE_PART',
      unit: 'Bộ',
      specifications: 'Dòng định mức 3150A, dòng cắt ngắn mạch 40kA/3s, áp suất SF6 0.6MPa',
      manufacturer: 'ABB (Thụy Sĩ)',
      minStock: 1,
      maxStock: 2,
    },
    {
      code: 'VT-HUB-RLY-PROT',
      name: 'Rơ-le kỹ thuật số bảo vệ so lệch Máy biến áp & Đường dây SEL-487E',
      category: 'SPARE_PART',
      unit: 'Cái',
      specifications: 'Hỗ trợ giao thức IEC 61850 GOOSE/MMS, bảo vệ 87T, 50/51, 67, 87L',
      manufacturer: 'Schweitzer Engineering Laboratories (Mỹ)',
      minStock: 2,
      maxStock: 4,
    },
    {
      code: 'VT-HUB-OIL-TRANS',
      name: 'Dầu cách điện Máy biến áp Shell Diala S4 ZX-I (209L)',
      category: 'CONSUMABLE',
      unit: 'Phuy',
      specifications: 'Dầu gốc công nghệ GTL (Gas-to-liquid) không lưu huỳnh, điện áp đánh thủng >70kV',
      manufacturer: 'Shell',
      minStock: 8,
      maxStock: 20,
    },
    {
      code: 'VT-TOOL-MEGGER-5KV',
      name: 'Máy đo điện trở cách điện Megomet 5kV Fluke 1555FC',
      category: 'TOOL',
      unit: 'Máy',
      specifications: 'Dải đo tới 2 TeraOhm, tự động tính DAR/PI, xuất báo cáo Fluke Connect',
      manufacturer: 'Fluke (Mỹ)',
      minStock: 1,
      maxStock: 2,
    },
    {
      code: 'VT-TOOL-THERMO-CAM',
      name: 'Camera ảnh nhiệt cầm tay kiểm tra mối nối Fluke Ti480 PRO',
      category: 'TOOL',
      unit: 'Máy',
      specifications: 'Độ phân giải nhiệt 640x480 pixel, dải nhiệt -20°C đến 1000°C',
      manufacturer: 'Fluke (Mỹ)',
      minStock: 1,
      maxStock: 2,
    },

    // --- 4.5 VẬT TƯ TIÊU HAO PHỔ THÔNG & BẢO HỘ LAO ĐỘNG (HSE) ---
    {
      code: 'VT-GEN-BOLT-M16',
      name: 'Bộ bu-lông đai ốc cường độ cao 8.8 mạ kẽm M16x60',
      category: 'CONSUMABLE',
      unit: 'Bộ',
      specifications: 'Thép hợp kim cấp bền 8.8 mạ kẽm nhúng nóng, gồm bu-lông, tán và 2 long đền',
      manufacturer: 'VSC Steel',
      minStock: 100,
      maxStock: 500,
    },
    {
      code: 'VT-GEN-TAPE-3M',
      name: 'Băng keo cách điện hạ thế chống cháy 3M Temflex Plus (Cuộn 18m)',
      category: 'CONSUMABLE',
      unit: 'Cuộn',
      specifications: 'Chịu điện áp 600V, nhiệt độ làm việc 80°C, chống ăn mòn và độ ẩm',
      manufacturer: '3M (Mỹ)',
      minStock: 20,
      maxStock: 100,
    },
    {
      code: 'VT-GEN-GREASE-XHP',
      name: 'Mỡ bôi trơn phức Lithium chịu nhiệt chịu tải Mobilgrease XHP 222 (16kg)',
      category: 'CONSUMABLE',
      unit: 'Xô',
      specifications: 'Độ nhớt dầu gốc ISO 220, cấp NLGI 2, chịu áp lực cực trị EP chống rửa trôi',
      manufacturer: 'Mobil',
      minStock: 5,
      maxStock: 20,
    },
    {
      code: 'VT-HSE-GLOVE-22KV',
      name: 'Găng tay cao su cách điện 22kV Regeltex Class 2 kèm găng da bảo vệ',
      category: 'HSE',
      unit: 'Đôi',
      specifications: 'Tiêu chuẩn IEC 60903, thử nghiệm điện áp 20.000V, làm việc an toàn 17.000V',
      manufacturer: 'Regeltex (Pháp)',
      minStock: 5,
      maxStock: 20,
    },
    {
      code: 'VT-HSE-EXTING-CO2',
      name: 'Bình chữa cháy khí CO2 chuyên dụng phòng điện MT5 (5kg)',
      category: 'HSE',
      unit: 'Bình',
      specifications: 'Khí CO2 nguyên chất chữa cháy điện không để lại cặn, van đồng đạt chuẩn PCCC',
      manufacturer: 'Dragon / Tomoken',
      minStock: 10,
      maxStock: 30,
    },
  ];

  const materialMap = new Map<string, MaterialEntity>();

  for (const mDef of materialDefinitions) {
    let mat = await materialRepository.findOne({
      where: { tenantId: tenant.id, code: mDef.code },
    });
    if (!mat) {
      mat = materialRepository.create({
        tenantId: tenant.id,
        code: mDef.code,
      });
    }
    mat.name = mDef.name;
    mat.category = mDef.category;
    mat.unit = mDef.unit;
    mat.specifications = mDef.specifications;
    mat.manufacturer = mDef.manufacturer;
    mat.minStock = mDef.minStock;
    mat.maxStock = mDef.maxStock;
    mat.isActive = true;
    mat = await materialRepository.save(mat);
    materialMap.set(mDef.code, mat);
  }

  // =========================================================================
  // 5. KHỞI TẠO TỒN KHO THỰC TẾ & GIỮ CHỖ (MATERIAL INVENTORY)
  // =========================================================================
  const inventorySetup = [
    // --- Tổng kho Chiến lược Công ty Mẹ ---
    { wh: 'WH_CENTRAL_HUB', loc: 'HUB-STRAT-A1-BIN01', mat: 'VT-HUB-TRF-110KV', qty: 2, reserved: 0 },
    { wh: 'WH_CENTRAL_HUB', loc: 'HUB-STRAT-A1-BIN01', mat: 'VT-HUB-CB-SF6', qty: 2, reserved: 0 },
    { wh: 'WH_CENTRAL_HUB', loc: 'HUB-STRAT-A2-BIN01', mat: 'VT-HUB-RLY-PROT', qty: 4, reserved: 1 },
    { wh: 'WH_CENTRAL_HUB', loc: 'HUB-OIL-Z01', mat: 'VT-HUB-OIL-TRANS', qty: 15, reserved: 2 },
    { wh: 'WH_CENTRAL_HUB', loc: 'HUB-HSE-R01-BIN01', mat: 'VT-TOOL-MEGGER-5KV', qty: 2, reserved: 0 },
    { wh: 'WH_CENTRAL_HUB', loc: 'HUB-HSE-R01-BIN01', mat: 'VT-TOOL-THERMO-CAM', qty: 2, reserved: 0 },
    { wh: 'WH_CENTRAL_HUB', loc: 'HUB-HSE-R01-BIN01', mat: 'VT-HSE-GLOVE-22KV', qty: 12, reserved: 2 },

    // --- Nhà máy Thủy điện ---
    { wh: 'WH_HPP_MAIN', loc: 'HPP-MECH-R01-S01', mat: 'VT-HPP-BRG-SKF6208', qty: 6, reserved: 2 },
    { wh: 'WH_HPP_MAIN', loc: 'HPP-MECH-R01-S02', mat: 'VT-HPP-SEAL-C4400', qty: 4, reserved: 1 },
    { wh: 'WH_HPP_MAIN', loc: 'HPP-ELEC-T01-BIN01', mat: 'VT-HPP-GOV-PLC', qty: 2, reserved: 0 },
    { wh: 'WH_HPP_MAIN', loc: 'HPP-OIL-Z01', mat: 'VT-HPP-OIL-HYD46', qty: 8, reserved: 2 },
    { wh: 'WH_HPP_MAIN', loc: 'HPP-MECH-R01-S01', mat: 'VT-HPP-FILTER-OIL', qty: 12, reserved: 4 },
    { wh: 'WH_HPP_WORKSHOP', loc: 'HPP-WS-CAB-E1', mat: 'VT-HPP-BRUSH-GEN', qty: 24, reserved: 4 },
    { wh: 'WH_HPP_WORKSHOP', loc: 'HPP-WS-RACK-A1', mat: 'VT-GEN-BOLT-M16', qty: 200, reserved: 50 },
    { wh: 'WH_HPP_WORKSHOP', loc: 'HPP-WS-RACK-A1', mat: 'VT-GEN-GREASE-XHP', qty: 8, reserved: 1 },
    { wh: 'WH_HPP_SHIFT', loc: 'HPP-SH-CONS-BIN01', mat: 'VT-GEN-TAPE-3M', qty: 25, reserved: 0 },
    { wh: 'WH_HPP_SHIFT', loc: 'HPP-SH-CONS-BIN01', mat: 'VT-HSE-EXTING-CO2', qty: 12, reserved: 0 },

    // --- Nhà máy Điện gió ---
    { wh: 'WH_WPP_MAIN', loc: 'WPP-NAC-R01-BIN01', mat: 'VT-WPP-BRG-GBX', qty: 3, reserved: 1 },
    { wh: 'WH_WPP_MAIN', loc: 'WPP-PCH-R02-BIN01', mat: 'VT-WPP-MTR-PITCH', qty: 2, reserved: 1 },
    { wh: 'WH_WPP_MAIN', loc: 'WPP-YAW-R03-BIN01', mat: 'VT-WPP-MTR-YAW', qty: 3, reserved: 0 },
    { wh: 'WH_WPP_MAIN', loc: 'WPP-YAW-R03-BIN01', mat: 'VT-WPP-SEN-ANEMO', qty: 3, reserved: 0 },
    { wh: 'WH_WPP_MAIN', loc: 'WPP-OIL-Z01', mat: 'VT-WPP-OIL-MOBIL320', qty: 10, reserved: 2 },
    { wh: 'WH_WPP_TURBINE', loc: 'WPP-TB-RESIN-BIN01', mat: 'VT-WPP-RESIN-BLADE', qty: 6, reserved: 1 },
    { wh: 'WH_WPP_TURBINE', loc: 'WPP-PCH-R02-BIN01', mat: 'VT-WPP-BAT-PITCH', qty: 12, reserved: 4 },
    { wh: 'WH_WPP_TURBINE', loc: 'WPP-TB-BOLT-BIN02', mat: 'VT-GEN-BOLT-M16', qty: 150, reserved: 20 },
    { wh: 'WH_WPP_SHIFT', loc: 'WPP-SH-TOOL-BOX01', mat: 'VT-GEN-TAPE-3M', qty: 30, reserved: 0 },
    { wh: 'WH_WPP_SHIFT', loc: 'WPP-SH-HARNESS-01', mat: 'VT-HSE-GLOVE-22KV', qty: 8, reserved: 0 },

    // --- Nhà máy Điện mặt trời ---
    { wh: 'WH_SPP_MAIN', loc: 'SPP-PV-Z01-RACK01', mat: 'VT-SPP-PV-550W', qty: 35, reserved: 5 },
    { wh: 'WH_SPP_MAIN', loc: 'SPP-ELEC-R02-BIN01', mat: 'VT-SPP-MC4-CONN', qty: 320, reserved: 50 },
    { wh: 'WH_SPP_MAIN', loc: 'SPP-ELEC-R02-BIN01', mat: 'VT-SPP-FUSE-DC1500', qty: 65, reserved: 10 },
    { wh: 'WH_SPP_MAIN', loc: 'SPP-INV-R01-BIN01', mat: 'VT-SPP-IGBT-MOD', qty: 4, reserved: 1 },
    { wh: 'WH_SPP_MAIN', loc: 'SPP-INV-R01-BIN01', mat: 'VT-SPP-FAN-INV', qty: 8, reserved: 2 },
    { wh: 'WH_SPP_FIELD', loc: 'SPP-ELEC-R02-BIN01', mat: 'VT-SPP-CABLE-DC6', qty: 650, reserved: 100 },
    { wh: 'WH_SPP_SHIFT', loc: 'SPP-SH-ROBOT-01', mat: 'VT-SPP-CLEAN-ROBOT', qty: 6, reserved: 0 },
    { wh: 'WH_SPP_SHIFT', loc: 'SPP-SH-TEST-01', mat: 'VT-GEN-TAPE-3M', qty: 40, reserved: 0 },
    { wh: 'WH_SPP_SHIFT', loc: 'SPP-SH-TEST-01', mat: 'VT-HSE-EXTING-CO2', qty: 15, reserved: 0 },
  ];

  for (const invItem of inventorySetup) {
    const wh = warehouseMap.get(invItem.wh);
    const mat = materialMap.get(invItem.mat);
    const loc = locationMap.get(`${invItem.wh}:${invItem.loc}`);

    if (!wh || !mat) continue;

    let record = await inventoryRepository.findOne({
      where: {
        tenantId: tenant.id,
        warehouseId: wh.id,
        materialId: mat.id,
        locationId: loc ? loc.id : IsNull(),
      },
    });

    if (!record) {
      record = inventoryRepository.create({
        tenantId: tenant.id,
        warehouseId: wh.id,
        materialId: mat.id,
        locationId: loc ? loc.id : null,
      });
    }

    record.quantity = invItem.qty;
    record.quantityReserved = invItem.reserved;
    record.location = loc ? loc.name : null;
    await inventoryRepository.save(record);
  }

  // =========================================================================
  // 6. KHỞI TẠO SỔ GIAO DỊCH LỊCH SỬ KHO (INVENTORY TRANSACTIONS AUDIT LEDGER)
  // =========================================================================
  const sampleTransactions = [
    {
      wh: 'WH_CENTRAL_HUB',
      mat: 'VT-HUB-TRF-110KV',
      code: 'NK-HUB-2026-001',
      type: 'IMPORT',
      qty: 2,
      refType: 'PURCHASE_ORDER',
      note: 'Nhập kho 02 Máy biến áp tăng áp chính 110kV 63MVA Thibidi phục vụ dự phòng chiến lược công ty mẹ',
    },
    {
      wh: 'WH_CENTRAL_HUB',
      mat: 'VT-HUB-OIL-TRANS',
      code: 'NK-HUB-2026-002',
      type: 'IMPORT',
      qty: 15,
      refType: 'PURCHASE_ORDER',
      note: 'Nhập 15 phuy dầu cách điện Shell Diala S4 ZX-I',
    },
    {
      wh: 'WH_HPP_MAIN',
      mat: 'VT-HPP-BRG-SKF6208',
      code: 'NK-HPP-2026-001',
      type: 'IMPORT',
      qty: 6,
      refType: 'PURCHASE_ORDER',
      note: 'Nhập vòng bi SKF 6208 cho kỳ trung tu tổ máy H1',
    },
    {
      wh: 'WH_HPP_MAIN',
      mat: 'VT-HPP-BRG-SKF6208',
      code: 'XK-HPP-2026-001',
      type: 'EXPORT',
      qty: 2,
      refType: 'WORK_ORDER',
      note: 'Xuất kho 02 vòng bi thay thế khẩn cấp theo Phiếu bảo dưỡng WO-2026-00142',
    },
    {
      wh: 'WH_WPP_MAIN',
      mat: 'VT-WPP-OIL-MOBIL320',
      code: 'NK-WPP-2026-001',
      type: 'IMPORT',
      qty: 10,
      refType: 'PURCHASE_ORDER',
      note: 'Nhập định kỳ dầu nhớt hộp số Mobilgear SHC XMP 320 cho 25 tuabin điện gió',
    },
    {
      wh: 'WH_WPP_MAIN',
      mat: 'VT-WPP-OIL-MOBIL320',
      code: 'DC-WPP-2026-001',
      type: 'TRANSFER',
      qty: 2,
      refType: 'OPERATION',
      note: 'Điều chuyển 02 phuy dầu nhớt sang trạm kỹ thuật Tuabin WTG-01 để thay dầu định kỳ',
    },
    {
      wh: 'WH_SPP_MAIN',
      mat: 'VT-SPP-PV-550W',
      code: 'NK-SPP-2026-001',
      type: 'IMPORT',
      qty: 35,
      refType: 'PURCHASE_ORDER',
      note: 'Nhập lô tấm pin Jinko Solar 550W dự phòng sự cố mưa đá và nứt bề mặt',
    },
    {
      wh: 'WH_SPP_MAIN',
      mat: 'VT-SPP-FUSE-DC1500',
      code: 'XK-SPP-2026-001',
      type: 'EXPORT',
      qty: 10,
      refType: 'WORK_ORDER',
      note: 'Xuất 10 cầu chì DC 1500V xử lý đứt cầu chì chuỗi String Block 03 theo WO-2026-00210',
    },
  ];

  for (const tx of sampleTransactions) {
    const wh = warehouseMap.get(tx.wh);
    const mat = materialMap.get(tx.mat);
    if (!wh || !mat) continue;

    let existingTx = await transactionRepository.findOne({
      where: {
        tenantId: tenant.id,
        transactionCode: tx.code,
      },
    });

    if (!existingTx) {
      existingTx = transactionRepository.create({
        tenantId: tenant.id,
        transactionCode: tx.code,
        warehouseId: wh.id,
        materialId: mat.id,
        type: tx.type as any,
        quantity: tx.qty,
        referenceType: tx.refType,
        note: tx.note,
        createdBy: adminUser ? adminUser.id : null,
      });
      await transactionRepository.save(existingTx);
    }
  }

  process.stdout.write(
    '  -> Seeded comprehensive 3-Plant Warehouse & Inventory Master Data (Hydro, Wind, Solar, Central Hub).\n',
  );
}
