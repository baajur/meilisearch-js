/*
 * Bundle: MeiliSearch / Indexes
 * Project: MeiliSearch - Javascript API
 * Author: Quentin de Quelen <quentin@meilisearch.com>
 * Copyright: 2019, MeiliSearch
 */

'use strict'

import MeiliSearchError from './errors/meilisearch-error'
import MeiliSearchTimeOutError from './errors/meilisearch-timeout-error'
import MeiliAxiosWrapper from './meili-axios-wrapper'
import * as Types from './types'
import { sleep, removeUndefinedFromObject } from './utils'

class Index<T> extends MeiliAxiosWrapper implements Types.IndexInterface<T> {
  uid: string
  constructor(config: Types.Config, uid: string) {
    super(config)
    this.uid = uid
  }

  ///
  /// UPDATES
  ///

  /**
   * Get the informations about an update status
   * @memberof Index
   * @method getUpdateStatus
   */
  async getUpdateStatus(updateId: number): Promise<Types.Update> {
    const url = `/indexes/${this.uid}/updates/${updateId}`

    return await this.get(url)
  }

  async waitForPendingUpdate(
    updateId: number,
    {
      timeOutMs = 5000,
      intervalMs = 50,
    }: { timeOutMs?: number; intervalMs?: number } = {}
  ): Promise<Types.Update> {
    const startingTime = Date.now()
    while (Date.now() - startingTime < timeOutMs) {
      const response = await this.getUpdateStatus(updateId)
      if (response.status !== 'enqueued') return response
      await sleep(intervalMs)
    }
    throw new MeiliSearchTimeOutError(
      `timeout of ${timeOutMs}ms has exceeded on process ${updateId} when waiting for pending update to resolve.`
    )
  }

  /**
   * Get the list of all updates
   * @memberof Index
   * @method getAllUpdateStatus
   */
  async getAllUpdateStatus(): Promise<Types.Update[]> {
    const url = `/indexes/${this.uid}/updates`

    return await this.get(url)
  }

  ///
  /// SEARCH
  ///

  /**
   * Search for documents into an index
   * @memberof Index
   * @method search
   */
  async search<P extends Types.SearchParams<T>>(
    query?: string | null,
    options?: P,
    method: Types.Methods = 'POST'
  ): Promise<Types.SearchResponse<T, P>> {
    const url = `/indexes/${this.uid}/search`
    const params: Types.SearchRequest = {
      q: query,
      offset: options?.offset,
      limit: options?.limit,
      cropLength: options?.cropLength,
      filters: options?.filters,
      matches: options?.matches,
      facetFilters: options?.facetFilters,
      facetsDistribution: options?.facetsDistribution,
      attributesToRetrieve: options?.attributesToRetrieve,
      attributesToCrop: options?.attributesToCrop,
      attributesToHighlight: options?.attributesToHighlight,
    }
    if (method.toUpperCase() === 'POST') {
      return await this.post(url, removeUndefinedFromObject(params), {
        cancelToken: this.cancelTokenSource.token,
      })
    } else if (method.toUpperCase() === 'GET') {
      const getParams: Types.GetSearchRequest = {
        ...params,
        facetFilters:
          Array.isArray(options?.facetFilters) && options?.facetFilters
            ? JSON.stringify(options.facetFilters)
            : undefined,
        facetsDistribution: options?.facetsDistribution
          ? JSON.stringify(options.facetsDistribution)
          : undefined,
        attributesToRetrieve: options?.attributesToRetrieve
          ? options.attributesToRetrieve.join(',')
          : undefined,
        attributesToCrop: options?.attributesToCrop
          ? options.attributesToCrop.join(',')
          : undefined,
        attributesToHighlight: options?.attributesToHighlight
          ? options.attributesToHighlight.join(',')
          : undefined,
      }

      return await this.get(url, {
        params: removeUndefinedFromObject(getParams),
        cancelToken: this.cancelTokenSource.token,
      })
    } else {
      throw new MeiliSearchError(
        'method parameter should be either POST or GET'
      )
    }
  }

  ///
  /// INDEX
  ///
  /**
   * Show index information.
   * @memberof Index
   * @method show
   */
  async show(): Promise<Types.IndexResponse> {
    const url = `/indexes/${this.uid}`

    return await this.get(url)
  }

  /**
   * Update an index.
   * @memberof Index
   * @method updateIndex
   */
  async updateIndex(data: Types.IndexOptions): Promise<Types.IndexResponse> {
    const url = `/indexes/${this.uid}`

    return await this.put(url, data)
  }

  /**
   * Delete an index.
   * @memberof Index
   * @method deleteIndex
   */

  async deleteIndex(): Promise<string> {
    const url = `/indexes/${this.uid}`

    return await this.delete(url)
  }

  ///
  /// STATS
  ///

  /**
   * get stats of an index
   * @memberof Index
   * @method getStats
   */
  async getStats(): Promise<Types.IndexStats> {
    const url = `/indexes/${this.uid}/stats`

    return await this.get(url)
  }
  ///
  /// DOCUMENTS
  ///

  /**
   * get documents of an index
   * @memberof Index
   * @method getDocuments
   */
  async getDocuments<P extends Types.GetDocumentsParams<T>>(
    options?: P
  ): Promise<Types.GetDocumentsResponse<T, P>> {
    const url = `/indexes/${this.uid}/documents`
    let attr
    if (options !== undefined && Array.isArray(options.attributesToRetrieve)) {
      attr = options.attributesToRetrieve.join(',')
    }

    return await this.get(url, {
      params: {
        ...options,
        ...(attr !== undefined ? { attributesToRetrieve: attr } : {}),
      },
    })
  }

  /**
   * Get one document
   * @memberof Index
   * @method getDocument
   */
  async getDocument(documentId: string | number): Promise<Types.Document<T>> {
    const url = `/indexes/${this.uid}/documents/${documentId}`

    return await this.get(url)
  }

  /**
   * Add or replace multiples documents to an index
   * @memberof Index
   * @method addDocuments
   */
  async addDocuments(
    documents: Array<Types.Document<T>>,
    options?: Types.AddDocumentParams
  ): Promise<Types.EnqueuedUpdate> {
    const url = `/indexes/${this.uid}/documents`

    return await this.post(url, documents, {
      params: options,
    })
  }

  /**
   * Add or update multiples documents to an index
   * @memberof Index
   * @method updateDocuments
   */
  async updateDocuments(
    documents: Array<Types.Document<T>>,
    options?: Types.AddDocumentParams
  ): Promise<Types.EnqueuedUpdate> {
    const url = `/indexes/${this.uid}/documents`

    return await this.put(url, documents, {
      params: options,
    })
  }

  /**
   * Delete one document
   * @memberof Index
   * @method deleteDocument
   */
  async deleteDocument(
    documentId: string | number
  ): Promise<Types.EnqueuedUpdate> {
    const url = `/indexes/${this.uid}/documents/${documentId}`

    return await this.delete(url)
  }

  /**
   * Delete multiples documents of an index
   * @memberof Index
   * @method deleteDocuments
   */
  async deleteDocuments(
    documentsIds: string[] | number[]
  ): Promise<Types.EnqueuedUpdate> {
    const url = `/indexes/${this.uid}/documents/delete-batch`

    return await this.post(url, documentsIds)
  }

  /**
   * Delete all documents of an index
   * @memberof Index
   * @method deleteAllDocuments
   */
  async deleteAllDocuments(): Promise<Types.EnqueuedUpdate> {
    const url = `/indexes/${this.uid}/documents`

    return await this.delete(url)
  }

  ///
  /// SETTINGS
  ///

  /**
   * Retrieve all settings
   * @memberof Index
   * @method getSettings
   */
  async getSettings(): Promise<Types.Settings> {
    const url = `/indexes/${this.uid}/settings`

    return await this.get(url)
  }

  /**
   * Update all settings
   * Any parameters not provided will be left unchanged.
   * @memberof Index
   * @method updateSettings
   */
  async updateSettings(
    settings: Types.Settings
  ): Promise<Types.EnqueuedUpdate> {
    const url = `/indexes/${this.uid}/settings`

    return await this.post(url, settings)
  }

  /**
   * Reset settings.
   * @memberof Index
   * @method resetSettings
   */
  async resetSettings(): Promise<Types.EnqueuedUpdate> {
    const url = `/indexes/${this.uid}/settings`

    return await this.delete(url)
  }

  ///
  /// SYNONYMS
  ///

  /**
   * Get the list of all synonyms
   * @memberof Index
   * @method getSynonyms
   */
  async getSynonyms(): Promise<object> {
    const url = `/indexes/${this.uid}/settings/synonyms`

    return await this.get(url)
  }

  /**
   * Update the list of synonyms. Overwrite the old list.
   * @memberof Index
   * @method updateSynonyms
   */
  async updateSynonyms(synonyms: object): Promise<Types.EnqueuedUpdate> {
    const url = `/indexes/${this.uid}/settings/synonyms`

    return await this.post(url, synonyms)
  }

  /**
   * Reset the synonym list to be empty again
   * @memberof Index
   * @method resetSynonyms
   */
  async resetSynonyms(): Promise<Types.EnqueuedUpdate> {
    const url = `/indexes/${this.uid}/settings/synonyms`

    return await this.delete(url)
  }

  ///
  /// STOP WORDS
  ///

  /**
   * Get the list of all stop-words
   * @memberof Index
   * @method getStopWords
   */
  async getStopWords(): Promise<string[]> {
    const url = `/indexes/${this.uid}/settings/stop-words`

    return await this.get(url)
  }

  /**
   * Update the list of stop-words. Overwrite the old list.
   * @memberof Index
   * @method updateStopWords
   */
  async updateStopWords(stopWords: string[]): Promise<Types.EnqueuedUpdate> {
    const url = `/indexes/${this.uid}/settings/stop-words`

    return await this.post(url, stopWords)
  }

  /**
   * Reset the stop-words list to be empty again
   * @memberof Index
   * @method resetStopWords
   */
  async resetStopWords(): Promise<Types.EnqueuedUpdate> {
    const url = `/indexes/${this.uid}/settings/stop-words`

    return await this.delete(url)
  }

  ///
  /// RANKING RULES
  ///

  /**
   * Get the list of all ranking-rules
   * @memberof Index
   * @method getRankingRules
   */
  async getRankingRules(): Promise<string[]> {
    const url = `/indexes/${this.uid}/settings/ranking-rules`

    return await this.get(url)
  }

  /**
   * Update the list of ranking-rules. Overwrite the old list.
   * @memberof Index
   * @method updateRankingRules
   */
  async updateRankingRules(
    rankingRules: string[]
  ): Promise<Types.EnqueuedUpdate> {
    const url = `/indexes/${this.uid}/settings/ranking-rules`

    return await this.post(url, rankingRules)
  }

  /**
   * Reset the ranking rules list to its default value
   * @memberof Index
   * @method resetRankingRules
   */
  async resetRankingRules(): Promise<Types.EnqueuedUpdate> {
    const url = `/indexes/${this.uid}/settings/ranking-rules`

    return await this.delete(url)
  }

  ///
  /// DISTINCT ATTRIBUTE
  ///

  /**
   * Get the distinct-attribute
   * @memberof Index
   * @method getDistinctAttribute
   */
  async getDistinctAttribute(): Promise<string | null> {
    const url = `/indexes/${this.uid}/settings/distinct-attribute`

    return await this.get(url)
  }

  /**
   * Update the distinct-attribute.
   * @memberof Index
   * @method updateDistinctAttribute
   */
  async updateDistinctAttribute(
    distinctAttribute: string
  ): Promise<Types.EnqueuedUpdate> {
    const url = `/indexes/${this.uid}/settings/distinct-attribute`

    return await this.post(url, distinctAttribute)
  }

  /**
   * Reset the distinct-attribute.
   * @memberof Index
   * @method resetDistinctAttribute
   */
  async resetDistinctAttribute(): Promise<Types.EnqueuedUpdate> {
    const url = `/indexes/${this.uid}/settings/distinct-attribute`

    return await this.delete(url)
  }

  ///
  /// ATTRIBUTES FOR FACETING
  ///

  /**
   * Get the attributes-for-faceting
   * @memberof Index
   * @method getAttributesForFaceting
   */
  async getAttributesForFaceting(): Promise<string[]> {
    const url = `/indexes/${this.uid}/settings/attributes-for-faceting`

    return await this.get(url)
  }

  /**
   * Update the attributes-for-faceting.
   * @memberof Index
   * @method updateAttributesForFaceting
   */
  async updateAttributesForFaceting(
    attributesForFaceting: string[]
  ): Promise<Types.EnqueuedUpdate> {
    const url = `/indexes/${this.uid}/settings/attributes-for-faceting`

    return await this.post(url, attributesForFaceting)
  }

  /**
   * Reset the attributes-for-faceting.
   * @memberof Index
   * @method resetAttributesForFaceting
   */
  async resetAttributesForFaceting(): Promise<Types.EnqueuedUpdate> {
    const url = `/indexes/${this.uid}/settings/attributes-for-faceting`

    return await this.delete(url)
  }

  ///
  /// SEARCHABLE ATTRIBUTE
  ///

  /**
   * Get the searchable-attributes
   * @memberof Index
   * @method getSearchableAttributes
   */
  async getSearchableAttributes(): Promise<string[]> {
    const url = `/indexes/${this.uid}/settings/searchable-attributes`

    return await this.get(url)
  }

  /**
   * Update the searchable-attributes.
   * @memberof Index
   * @method updateSearchableAttributes
   */
  async updateSearchableAttributes(
    searchableAttributes: string[]
  ): Promise<Types.EnqueuedUpdate> {
    const url = `/indexes/${this.uid}/settings/searchable-attributes`

    return await this.post(url, searchableAttributes)
  }

  /**
   * Reset the searchable-attributes.
   * @memberof Index
   * @method resetSearchableAttributes
   */
  async resetSearchableAttributes(): Promise<Types.EnqueuedUpdate> {
    const url = `/indexes/${this.uid}/settings/searchable-attributes`

    return await this.delete(url)
  }

  ///
  /// DISPLAYED ATTRIBUTE
  ///

  /**
   * Get the displayed-attributes
   * @memberof Index
   * @method getDisplayedAttributes
   */
  async getDisplayedAttributes(): Promise<string[]> {
    const url = `/indexes/${this.uid}/settings/displayed-attributes`

    return await this.get(url)
  }

  /**
   * Update the displayed-attributes.
   * @memberof Index
   * @method updateDisplayedAttributes
   */
  async updateDisplayedAttributes(
    displayedAttributes: string[]
  ): Promise<Types.EnqueuedUpdate> {
    const url = `/indexes/${this.uid}/settings/displayed-attributes`

    return await this.post(url, displayedAttributes)
  }

  /**
   * Reset the displayed-attributes.
   * @memberof Index
   * @method resetDisplayedAttributes
   */
  async resetDisplayedAttributes(): Promise<Types.EnqueuedUpdate> {
    const url = `/indexes/${this.uid}/settings/displayed-attributes`

    return await this.delete(url)
  }
}

export { Index }
