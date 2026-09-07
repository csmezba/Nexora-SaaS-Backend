import { registerEnumType } from '@nestjs/graphql';

export enum DependencyType {
  BLOCKS = 'BLOCKS',
  RELATES_TO = 'RELATES_TO',
}

registerEnumType(DependencyType, {
  name: 'DependencyType',
  description: 'Type of task dependency relation',
});
