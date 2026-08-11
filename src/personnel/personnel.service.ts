import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DonVi } from './entities/don-vi.entity';
import { PhongBan } from './entities/phong-ban.entity';
import { NhanSu } from './entities/nhan-su.entity';

export type OrganizationTreeNode = {
  ma_dinh_danh: string;
  ten: string;
  loai: string;
  nhan_su: unknown[];
  children: OrganizationTreeNode[];
};

@Injectable()
export class PersonnelService {
  constructor(
    @InjectRepository(DonVi)
    private donViRepository: Repository<DonVi>,
    @InjectRepository(PhongBan)
    private phongBanRepository: Repository<PhongBan>,
    @InjectRepository(NhanSu)
    private nhanSuRepository: Repository<NhanSu>,
  ) {}

  async getOrganizationTree(): Promise<OrganizationTreeNode[]> {
    const [allDonVi, allPhongBan, allNhanSu] = await Promise.all([
      this.donViRepository.find(),
      this.phongBanRepository.find(),
      this.nhanSuRepository.find({ relations: ['chuc_danh', 'phong_ban'] }),
    ]);

    const nhanSuMap = new Map<string, any[]>();
    allNhanSu.forEach((ns) => {
      if (ns.phong_ban) {
        const key = ns.phong_ban.ma_phong_ban;
        if (!nhanSuMap.has(key)) {
          nhanSuMap.set(key, []);
        }
        nhanSuMap.get(key)!.push({
          ma_nhan_vien: ns.ma_nhan_vien,
          ho_ten: ns.ho_ten,
          ma_chuc_danh: ns.chuc_danh?.ma_chuc_danh,
          ten_chuc_danh: ns.chuc_danh?.ten_chuc_danh,
        });
      }
    });

    const phongBanMap = new Map<number, OrganizationTreeNode[]>();
    allPhongBan.forEach((pb) => {
      const key = pb.don_vi_id;
      if (!phongBanMap.has(key)) {
        phongBanMap.set(key, []);
      }
      phongBanMap.get(key)!.push({
        ma_dinh_danh: pb.ma_phong_ban,
        ten: pb.ten_phong_ban,
        loai: pb.loai_phong_ban,
        nhan_su: nhanSuMap.get(pb.ma_phong_ban) || [],
        children: [], // PhongBan entities don't have children according to the schema
      });
    });

    const buildTree = (donVi: DonVi): OrganizationTreeNode => {
      const childrenOfDonVi = allDonVi
        .filter((d) => d.parent_id === donVi.id)
        .map(buildTree);
      const phongBanOfDonVi = phongBanMap.get(donVi.id) || [];

      return {
        ma_dinh_danh: donVi.ma_don_vi,
        ten: donVi.ten_don_vi,
        loai: donVi.loai_don_vi,
        nhan_su: [], // Per schema, DonVi doesn't directly have NhanSu
        children: [...childrenOfDonVi, ...phongBanOfDonVi],
      };
    };

    const rootDonVis = allDonVi.filter((d) => d.parent_id === null);
    const tree = rootDonVis.map(buildTree);

    return tree;
  }
}
