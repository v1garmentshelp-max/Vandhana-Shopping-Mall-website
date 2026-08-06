export type CategoryGender = "MEN" | "WOMEN" | "KIDS";

export interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  parentId: string | null;
  parent_id?: string | null;
  level: number;
  gender?: CategoryGender;
  categoryPath?: string;
  category_path?: string;
  is_active?: boolean;
  selectable?: boolean;
  sort_order?: number;
  children?: Category[];
}
