import type { PrismaClient, Prisma } from '@prisma/client'

import type { PrismaService } from '@/prisma/prisma.service'
import type { IsFunction } from '@/utils/type'

type BaseDelegate = {
  [TKey in keyof Prisma.BoardDelegate as Prisma.BoardDelegate[TKey] extends Function
    ? TKey
    : never]: Function
}

type PrismaDelegates = {
  [TEntityName in keyof PrismaClient as IsFunction<
    PrismaClient[TEntityName]
  > extends false
    ? TEntityName extends symbol
      ? never
      : PrismaClient[TEntityName] extends BaseDelegate
        ? TEntityName
        : never
    : never]: PrismaClient[TEntityName]
}

type EntityNames = keyof PrismaDelegates

export abstract class EntityBaseService<
  TEntityName extends EntityNames,
  TEntityDelegate extends
    PrismaDelegates[TEntityName] = PrismaDelegates[TEntityName],
> {
  protected constructor(
    protected readonly prisma: PrismaService,
    private readonly entityName: TEntityName,
  ) {}

  private get delegate() {
    return this.prisma[this.entityName]
  }

  get count(): TEntityDelegate['count'] {
    return this.delegate.count.bind(this.delegate)
  }

  get aggregate(): TEntityDelegate['aggregate'] {
    return this.delegate.aggregate.bind(this.delegate)
  }

  get find(): TEntityDelegate['findMany'] {
    return this.delegate.findMany.bind(this.delegate)
  }

  get findOne(): TEntityDelegate['findFirst'] {
    return this.delegate.findFirst.bind(this.delegate)
  }

  get update(): TEntityDelegate['update'] {
    return this.delegate.update.bind(this.delegate)
  }

  get updateMany(): TEntityDelegate['updateMany'] {
    return this.delegate.updateMany.bind(this.delegate)
  }

  get create(): TEntityDelegate['create'] {
    return this.delegate.create.bind(this.delegate)
  }

  get createMany(): TEntityDelegate['createMany'] {
    return this.delegate.createMany.bind(this.delegate)
  }

  get upsert(): TEntityDelegate['upsert'] {
    return this.delegate.upsert.bind(this.delegate)
  }
}
