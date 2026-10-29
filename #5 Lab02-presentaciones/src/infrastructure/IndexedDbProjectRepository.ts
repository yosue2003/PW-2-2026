import type { Project } from '../models/Project'
import type { IProjectRepository } from '../models/ports/IProjectRepository'

const STORE_NAME = 'projects'
const DATABASE_VERSION = 1

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = transaction.onerror = () => {
      reject(transaction.error ?? new Error('IndexedDB transaction failed'))
    }
  })
}

/** IndexedDB adapter for the project repository port. */
export class IndexedDbProjectRepository implements IProjectRepository {
  private databasePromise?: Promise<IDBDatabase>

  constructor(private readonly databaseName = 'lab02-presentations') {}

  async getAll(): Promise<Project[]> {
    const database = await this.getDatabase()
    const transaction = database.transaction(STORE_NAME, 'readonly')
    return requestResult(transaction.objectStore(STORE_NAME).getAll())
  }

  async getById(id: string): Promise<Project | undefined> {
    const database = await this.getDatabase()
    const transaction = database.transaction(STORE_NAME, 'readonly')
    return requestResult(transaction.objectStore(STORE_NAME).get(id))
  }

  async save(project: Project): Promise<void> {
    const database = await this.getDatabase()
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const completed = transactionComplete(transaction)
    transaction.objectStore(STORE_NAME).put(project)
    await completed
  }

  async delete(id: string): Promise<void> {
    const database = await this.getDatabase()
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const completed = transactionComplete(transaction)
    transaction.objectStore(STORE_NAME).delete(id)
    await completed
  }

  async close(): Promise<void> {
    if (!this.databasePromise) return
    const database = await this.databasePromise.catch(() => undefined)
    database?.close()
    this.databasePromise = undefined
  }

  private getDatabase(): Promise<IDBDatabase> {
    if (!this.databasePromise) {
      const opening = new Promise<IDBDatabase>((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
          reject(new Error('IndexedDB is unavailable in this environment'))
          return
        }

        const request = indexedDB.open(this.databaseName, DATABASE_VERSION)
        request.onupgradeneeded = () => {
          const database = request.result
          if (!database.objectStoreNames.contains(STORE_NAME)) {
            database.createObjectStore(STORE_NAME, { keyPath: 'id' })
          }
        }
        request.onsuccess = () => {
          request.result.onversionchange = () => request.result.close()
          resolve(request.result)
        }
        request.onerror = () => reject(request.error ?? new Error('Could not open IndexedDB'))
        request.onblocked = () => reject(new Error('Opening the IndexedDB database was blocked'))
      })
      this.databasePromise = opening.catch((error: unknown) => {
        this.databasePromise = undefined
        throw error
      })
    }
    return this.databasePromise!
  }
}
