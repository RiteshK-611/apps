import { render, RenderResult, screen, waitFor } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from 'react-query';
import React from 'react';
import nock from 'nock';
import NewSourceModal from './NewSourceModal';
import { mockGraphQL } from '../../../__tests__/helpers/graphql';
import {
  REQUEST_SOURCE_MUTATION,
  SOURCE_BY_FEED_QUERY,
} from '../../graphql/newSource';
import { AuthContextProvider } from '../../contexts/AuthContext';
import { AnonymousUser, LoggedUser } from '../../lib/user';
import user from '../../../__tests__/fixture/loggedUser';
import { NotificationsContextProvider } from '../../contexts/NotificationsContext';

const onRequestClose = jest.fn();

beforeEach(async () => {
  nock.cleanAll();
  jest.clearAllMocks();
});

const defaultAnonymousUser: AnonymousUser = {
  id: 'anonymous user',
  firstVisit: 'first visit',
  referrer: 'string',
};

const renderComponent = (
  userUpdate: LoggedUser | AnonymousUser = user,
): RenderResult => {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <AuthContextProvider
        user={userUpdate}
        updateUser={jest.fn()}
        tokenRefreshed
        getRedirectUri={jest.fn()}
        loadingUser={false}
        loadedUserFromCache
      >
        <NotificationsContextProvider>
          <NewSourceModal isOpen onRequestClose={onRequestClose} />
        </NotificationsContextProvider>
      </AuthContextProvider>
    </QueryClientProvider>,
  );
};

it('should show a message that no rss found', async () => {
  renderComponent();
  nock('http://localhost:3000')
    .get('/scrape/source')
    .query({ url: 'https://daily.dev' })
    .reply(200, { type: 'website', rss: [] });
  const input = await screen.findByRole('textbox');
  userEvent.type(input, 'https://daily.dev');
  const btn = await screen.findByText('Check link');
  btn.click();
  expect(
    await screen.findByText('Could not find RSS feed'),
  ).toBeInTheDocument();
});

it('should show a contact button on an unexpected error', async () => {
  renderComponent();
  nock('http://localhost:3000')
    .get('/scrape/source')
    .query({ url: 'https://daily.dev' })
    .reply(200, { type: 'unavailable' });
  const input = await screen.findByRole('textbox');
  userEvent.type(input, 'https://daily.dev');
  const btn = await screen.findByText('Check link');
  btn.click();
  expect(await screen.findByText('Contact')).toBeInTheDocument();
});

it('should show login modal for anonymous users', async () => {
  renderComponent(defaultAnonymousUser);
  const input = await screen.findByRole('textbox');
  userEvent.type(input, 'https://daily.dev');
  const btn = await screen.findByText('Check link');
  btn.click();
  expect(
    await screen.findByTestId('login state: submit new source'),
  ).toBeInTheDocument();
});

it('should show if the source already exists in the system', async () => {
  renderComponent();
  nock('http://localhost:3000')
    .get('/scrape/source')
    .query({ url: 'https://daily.dev' })
    .reply(200, {
      type: 'website',
      rss: [
        { url: 'https://daily.dev/blog/rss.xml', title: 'RSS' },
        { url: 'https://blog.shamun.dev/rss.xml', title: 'Ido RSS' },
      ],
    });
  const input = await screen.findByRole('textbox');
  userEvent.type(input, 'https://daily.dev');
  userEvent.click(await screen.findByText('Check link'));
  expect(await screen.findByText('RSS')).toBeInTheDocument();
  expect(await screen.findByText('Ido RSS')).toBeInTheDocument();
  userEvent.click(await screen.findByText('RSS'));
  const source = {
    id: 'daily',
    name: 'daily.dev',
    handle: 'daily',
    image: 'https://daily.dev',
  };
  mockGraphQL({
    request: {
      query: SOURCE_BY_FEED_QUERY,
      variables: { feed: 'https://daily.dev/blog/rss.xml' },
    },
    result: {
      data: {
        source,
      },
    },
  });

  const exists = `${source.name} already exist`;
  userEvent.click(await screen.findByText('Submit for review'));
  expect(await screen.findByText(exists)).toBeInTheDocument();
});

it('should send source request', async () => {
  renderComponent();
  nock('http://localhost:3000')
    .get('/scrape/source')
    .query({ url: 'https://daily.dev' })
    .reply(200, {
      type: 'website',
      rss: [
        { url: 'https://daily.dev/blog/rss.xml', title: 'RSS' },
        { url: 'https://blog.shamun.dev/rss.xml', title: 'Ido RSS' },
      ],
    });
  const input = await screen.findByRole('textbox');
  userEvent.type(input, 'https://daily.dev');
  userEvent.click(await screen.findByText('Check link'));
  expect(await screen.findByText('RSS')).toBeInTheDocument();
  expect(await screen.findByText('Ido RSS')).toBeInTheDocument();
  userEvent.click(await screen.findByText('RSS'));

  mockGraphQL({
    request: {
      query: SOURCE_BY_FEED_QUERY,
      variables: { feed: 'https://daily.dev/blog/rss.xml' },
    },
    result: {
      data: {
        source: null,
      },
    },
  });

  mockGraphQL({
    request: {
      query: REQUEST_SOURCE_MUTATION,
      variables: { data: { sourceUrl: 'https://daily.dev/blog/rss.xml' } },
    },
    result: {
      data: {
        source: {
          id: 'daily',
        },
      },
    },
  });

  userEvent.click(await screen.findByText('Submit for review'));
  await waitFor(() => expect(onRequestClose).toBeCalledTimes(1));
});
