import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findAll() {
    return this.usersRepository.find({ order: { createdAt: 'DESC' } });
  }

  create(name: string, email: string) {
    return this.usersRepository.save(this.usersRepository.create({ name, email }));
  }
}
