import { gql } from 'apollo-server-express'
import BigNumber from 'bignumber.js'
import { DataSources } from './apolloServer'

export enum EventTypes {
  EXCHANGE = 'EXCHANGE',
  RECEIVED = 'RECEIVED',
  SENT = 'SENT',
  FAUCET = 'FAUCET',
  VERIFICATION_REWARD = 'VERIFICATION_REWARD',
  VERIFICATION_FEE = 'VERIFICATION_FEE',
  ESCROW_SENT = 'ESCROW_SENT',
  ESCROW_RECEIVED = 'ESCROW_RECEIVED',
}

export interface ExchangeEvent {
  type: EventTypes
  timestamp: number
  block: number
  outValue: number
  outSymbol: string
  inValue: number
  inSymbol: string
  hash: string
}

export interface TransferEvent {
  type: EventTypes
  timestamp: number
  block: number
  value: number
  address: string
  comment: string
  symbol: string
  hash: string
}

export type EventInterface = ExchangeEvent | TransferEvent

export interface EventArgs {
  // Query params as defined by Blockscout's API
  address: string
  sort?: 'asc' | 'desc'
  startblock?: number
  endblock?: number
  page?: number
  offset?: number
}

export interface TransactionArgs {
  address: string
  token: 'cUSD' | 'cGLD'
  localCurrencyCode: string
  // startblock?: number
  // endblock?: number
  // page?: number
  // offset?: number
}

export interface ExchangeRate {
  rate: number
}

export interface CurrencyConversionArgs {
  sourceCurrencyCode?: string
  currencyCode: string
  timestamp?: number
}

export interface MoneyAmount {
  amount: BigNumber.Value
  currencyCode: string
  timestamp: number
}

export const typeDefs = gql`
  union Event = Exchange | Transfer

  type Exchange {
    type: String!
    # TODO(kamyar): Graphql currently does not support 64-bit int
    timestamp: Float!
    block: Int!
    outValue: Float!
    outSymbol: String!
    inValue: Float!
    inSymbol: String!
    hash: String!
  }

  type Transfer {
    type: String!
    # TODO(kamyar): Graphql currently does not support 64-bit int
    timestamp: Float!
    block: Int!
    value: Float!
    address: String!
    comment: String
    symbol: String!
    hash: String!
  }

  type ExchangeRate {
    rate: Decimal!
  }

  scalar Timestamp
  scalar Address
  # Custom scalar for decimal amounts, represented as String
  scalar Decimal

  enum Token {
    cUSD
    cGLD
  }

  type MoneyAmount {
    amount: Decimal!
    currencyCode: String!
    localAmount: LocalMoneyAmount
  }

  type LocalMoneyAmount {
    amount: Decimal!
    currencyCode: String!
    exchangeRate: Decimal!
  }

  enum TransactionType {
    EXCHANGE
    RECEIVED
    SENT
    ESCROW_SENT
    ESCROW_RECEIVED
    FAUCET
    VERIFICATION_REWARD
    VERIFICATION_FEE
    INVITE_SENT
    INVITE_RECEIVED
    PAY_REQUEST
    NETWORK_FEE
  }

  interface Transaction {
    type: TransactionType!
    timestamp: Timestamp!
    block: String!
    # signed amount (+/-)
    amount: MoneyAmount!
    hash: String!
  }

  type TransactionTransfer implements Transaction {
    type: TransactionType!
    timestamp: Timestamp!
    block: String!
    # signed amount (+/-)
    amount: MoneyAmount!
    address: Address!
    comment: String
    token: Token!
    hash: String!
  }

  type TransactionExchange implements Transaction {
    type: TransactionType!
    timestamp: Timestamp!
    block: String!
    # signed amount (+/-)
    amount: MoneyAmount!
    takerAmount: MoneyAmount!
    makerAmount: MoneyAmount!
    hash: String!
  }

  type TransactionConnection {
    edges: [TransactionEdge!]!
    pageInfo: PageInfo!
  }

  type TransactionEdge {
    node: Transaction
    cursor: String!
  }

  type PageInfo {
    hasPreviousPage: Boolean!
    hasNextPage: Boolean!
    firstCursor: String
    lastCursor: String
  }

  type Query {
    events(
      address: String!
      sort: String
      startblock: Int
      endblock: Int
      page: Int
      offset: Int
    ): [Event]

    rewards(
      address: String!
      sort: String
      startblock: Int
      endblock: Int
      page: Int
      offset: Int
    ): [Transfer]

    transactions(
      address: Address!
      token: Token!
      localCurrencyCode: String
      # pagination
      before: String
      last: Int
      after: String
      first: Int
    ): TransactionConnection

    currencyConversion(
      sourceCurrencyCode: String
      currencyCode: String!
      timestamp: Float
    ): ExchangeRate
  }
`

interface Context {
  dataSources: DataSources
  localCurrencyCode?: string
}

export const resolvers = {
  Query: {
    events: async (_source: any, args: EventArgs, context: Context) => {
      const { dataSources } = context
      console.log('==context events', context)
      return dataSources.blockscoutAPI.getFeedEvents(args)
    },
    rewards: async (_source: any, args: EventArgs, { dataSources }: Context) => {
      return dataSources.blockscoutAPI.getFeedRewards(args)
    },
    transactions: async (_source: any, args: TransactionArgs, context: Context) => {
      const { dataSources } = context
      console.log('==context transaction', context)
      context.localCurrencyCode = args.localCurrencyCode
      const transactions = await dataSources.blockscoutAPI.getTransactions(args)

      return {
        edges: transactions.map((tx) => ({
          node: tx,
          cursor: 'TODO',
        })),
        pageInfo: {
          hasPreviousPage: false,
          hasNextPage: false,
          firstCursor: 'TODO',
          lastCursor: 'TODO',
        },
      }
    },
    currencyConversion: async (
      _source: any,
      args: CurrencyConversionArgs,
      { dataSources }: Context
    ) => {
      const rate = await dataSources.currencyConversionAPI.getExchangeRate(args)
      return { rate: rate.toNumber() }
    },
  },
  // TODO(kamyar):  see the comment about union causing problems
  Event: {
    __resolveType(obj: EventInterface, context: any, info: any) {
      if (obj.type === EventTypes.EXCHANGE) {
        return 'Exchange'
      }
      if (
        obj.type === EventTypes.RECEIVED ||
        obj.type === EventTypes.ESCROW_RECEIVED ||
        obj.type === EventTypes.ESCROW_SENT ||
        obj.type === EventTypes.SENT ||
        obj.type === EventTypes.FAUCET ||
        obj.type === EventTypes.VERIFICATION_FEE ||
        obj.type === EventTypes.VERIFICATION_REWARD
      ) {
        return 'Transfer'
      }
      return null
    },
  },
  Transaction: {
    __resolveType(obj: EventInterface, context: any, info: any) {
      if (obj.type === EventTypes.EXCHANGE) {
        return 'TransactionExchange'
      }
      if (
        obj.type === EventTypes.RECEIVED ||
        obj.type === EventTypes.ESCROW_RECEIVED ||
        obj.type === EventTypes.ESCROW_SENT ||
        obj.type === EventTypes.SENT ||
        obj.type === EventTypes.FAUCET ||
        obj.type === EventTypes.VERIFICATION_FEE ||
        obj.type === EventTypes.VERIFICATION_REWARD
      ) {
        return 'TransactionTransfer'
      }
      return null
    },
  },
  MoneyAmount: {
    localAmount: async (moneyAmount: MoneyAmount, args: any, context: Context) => {
      const { dataSources, localCurrencyCode } = context
      console.log('==parent', moneyAmount)
      console.log('==localcurrencycode', localCurrencyCode)
      const rate = await dataSources.currencyConversionAPI.getExchangeRate({
        sourceCurrencyCode: moneyAmount.currencyCode,
        currencyCode: localCurrencyCode || 'USD',
        timestamp: moneyAmount.timestamp * 1000,
      })
      return {
        amount: new BigNumber(moneyAmount.amount).multipliedBy(rate).toString(),
        currencyCode: localCurrencyCode || 'USD',
        exchangeRate: rate.toString(),
      }
    },
  },
}
