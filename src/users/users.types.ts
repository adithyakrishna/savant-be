export interface User {
  id: string;
  name: string;
  email: string | null;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateUserDto = {
  name: string;
  email?: string | null;
};

export type UpdateUserDto = Partial<CreateUserDto>;
