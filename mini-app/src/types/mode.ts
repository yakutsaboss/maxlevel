// Mode types
export interface Mode {
  id: number;
  name: string;
  display_name: string;
  description: string;
  icon: string;
  is_active: boolean;
}

export interface UserMode {
  user_id: number;
  mode_id: number;
  is_active: boolean;
  activated_at: string;
  mode: Mode;
}
