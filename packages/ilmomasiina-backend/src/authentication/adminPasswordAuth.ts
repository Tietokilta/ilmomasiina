import bcrypt from "bcrypt";
import { BadRequest } from "http-errors";

const AdminPasswordAuth = {
  validateNewPassword: (password: string): void => {
    if (password.length < 10) {
      throw new BadRequest("Password must be at least 10 characters long");
    }
  },

  createHash: (password: string): string => bcrypt.hashSync(password, 10),

  verifyHash: (password: string, hash: string): boolean => bcrypt.compareSync(password, hash),
};

export default AdminPasswordAuth;
