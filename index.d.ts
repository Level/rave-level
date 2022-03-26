import { ManyLevelGuest } from 'many-level'
import { AbstractDatabaseOptions } from 'abstract-level'

/**
 * Use a [LevelDB](https://github.com/google/leveldb) database from multiple processes
 * with seamless failover.
 *
 * @template KDefault The default type of keys if not overridden on operations.
 * @template VDefault The default type of values if not overridden on operations.
 */
export class RaveLevel<KDefault = string, VDefault = string>
  extends ManyLevelGuest<KDefault, VDefault> {
  /**
   * Database constructor.
   *
   * @param location Directory path (relative or absolute) where LevelDB will
   * store its files.
   * @param options Options.
   */
  constructor (
    location: string,
    options?: DatabaseOptions<KDefault, VDefault> | undefined
  )
}

/**
 * Options for the {@link RaveLevel} constructor.
 */
declare interface DatabaseOptions<K, V> extends AbstractDatabaseOptions<K, V> {
  /**
   * If true, operations are retried upon connecting to a new leader. If false,
   * operations are aborted upon disconnect, which means to yield an error on e.g.
   * `db.get()`.
   *
   * @defaultValue `true`
   */
  retry?: boolean
}
