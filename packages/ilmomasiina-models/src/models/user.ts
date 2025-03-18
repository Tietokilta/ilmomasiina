export default interface UserAttributes {
  id: number;
  email: string;
  password: string | null;
  googleUserId: string | null;
}
