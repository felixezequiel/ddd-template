export class UserEntity {
  public id!: string;
  public name!: string;
  public email!: string;
  public addresses: Array<AddressEntity> = [];
}

export class AddressEntity {
  public id!: string;
  public street!: string;
  public number!: string;
  public city!: string;
  public state!: string;
  public zipCode!: string;
  public user!: UserEntity;
}
