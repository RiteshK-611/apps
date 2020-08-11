import React, { ReactElement, useContext, useState } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { NormalizedCacheObject, useMutation, useQuery } from '@apollo/client';
import { initializeApollo } from '../../lib/apolloClient';
import { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';
import { ParsedUrlQuery } from 'querystring';
import { getUser, LoggedUser } from '../../lib/user';
import styled from 'styled-components';
import {
  size05,
  size1,
  size10,
  size2,
  size3,
  size4,
  size6,
  size8,
  sizeN,
} from '../../styles/sizes';
import {
  typoLil1,
  typoLil2Base,
  typoMicro1,
  typoSmall,
  typoTriple,
} from '../../styles/typography';
import { postDateFormat } from '../../lib/dateFormat';
import { FloatButton, IconButton } from '../../components/Buttons';
import OpenLinkIcon from '../../icons/open_link.svg';
import UpvoteIcon from '../../icons/upvote.svg';
import CommentIcon from '../../icons/comment.svg';
import ShareIcon from '../../icons/share.svg';
import LazyImage from '../../components/LazyImage';
import {
  CANCEL_UPVOTE_MUTATION,
  CancelUpvoteData,
  POST_BY_ID_QUERY,
  PostData,
  updatePostUpvoteCache,
  UPVOTE_MUTATION,
  UpvoteData,
} from '../../graphql/posts';
import { RoundedImage, SmallRoundedImage } from '../../components/utilities';
import MainLayout from '../../components/MainLayout';
import AuthContext from '../../components/AuthContext';
import MainComment from '../../components/MainComment';
import {
  Comment,
  POST_COMMENTS_QUERY,
  PostCommentsData,
} from '../../graphql/comments';
import { laptop, mobileL, mobileM, tablet } from '../../styles/media';
import { colorPepper90 } from '../../styles/colors';
import { focusOutline } from '../../styles/utilities';

const NewCommentModal = dynamic(import('../../components/NewCommentModal'));

export interface Props {
  id: string;
  initialApolloState: NormalizedCacheObject;
  user: LoggedUser;
}

interface PostParams extends ParsedUrlQuery {
  id: string;
}

export async function getServerSideProps({
  params,
  req,
  res,
}: GetServerSidePropsContext<PostParams>): Promise<
  GetServerSidePropsResult<Props>
> {
  const { id } = params;
  const apolloClient = initializeApollo({ req });

  const [, , userRes] = await Promise.all([
    apolloClient.query({
      query: POST_BY_ID_QUERY,
      variables: {
        id,
      },
    }),
    apolloClient.query({
      query: POST_COMMENTS_QUERY,
      variables: {
        postId: id,
      },
    }),
    getUser({ req, res }),
  ]);

  return {
    props: {
      id,
      initialApolloState: apolloClient.cache.extract(),
      user: userRes.isLoggedIn ? (userRes.user as LoggedUser) : null,
    },
  };
}

const PostContainer = styled.main`
  display: flex;
  width: 100%;
  max-width: 40rem;
  flex-direction: column;
  align-items: stretch;
  padding: ${size6} ${size4} ${sizeN(16)};

  ${mobileL} {
    padding-bottom: ${size6};
  }

  ${tablet} {
    padding-left: ${size8};
    padding-right: ${size8};
    align-self: center;
  }

  ${laptop} {
    min-height: 100vh;
    border-left: 0.063rem solid var(--theme-separator);
    border-right: 0.063rem solid var(--theme-separator);
  }
`;

const PostInfo = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${size2};
`;

const PostInfoSubContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  margin: 0 ${size2};
`;

const MetadataContainer = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
`;

const Metadata = styled.span`
  color: var(--theme-disabled);
  ${typoSmall}
`;

const MetadataSeparator = styled.div`
  width: ${size05};
  height: ${size05};
  margin: 0 ${size1};
  background: var(--theme-disabled);
  border-radius: 100%;
`;

const SourceName = styled.div`
  ${typoLil2Base}
`;

const Title = styled.h1`
  margin: ${size2} 0;
  ${typoLil1}

  ${mobileL} {
    ${typoTriple}
  }
`;

const Tags = styled.div`
  margin-bottom: ${size4};
  color: var(--theme-disabled);
  text-transform: uppercase;
  ${typoSmall};
`;

const PostImage = styled(LazyImage)`
  margin: ${size2} 0;
  border-radius: ${size4};
`;

const ActionButtons = styled.div`
  display: flex;
  justify-content: space-between;
  padding-bottom: ${size4};
  border-bottom: 0.063rem solid var(--theme-separator);

  ${FloatButton} {
    .icon {
      margin-right: -${size1};

      ${mobileM} {
        margin-right: ${size2};
      }
    }

    span {
      display: none;

      ${mobileM} {
        display: inline-block;
      }
    }
  }
`;

const NewCommentContainer = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  padding: ${size3} ${size4};
  background: var(--theme-background-primary);
  box-shadow: 0 -${size2} ${size6} 0 ${colorPepper90}3D;

  ${mobileL} {
    position: relative;
    left: unset;
    right: unset;
    bottom: unset;
    padding: 0;
    background: none;
    box-shadow: none;
    margin-top: ${size10};
  }
`;

const NewCommentButton = styled.button`
  display: flex;
  width: 100%;
  height: ${size10};
  align-items: center;
  padding: 0 ${size4};
  background: var(--theme-hover);
  color: var(--theme-secondary);
  border: none;
  border-radius: ${size4};
  cursor: pointer;
  ${typoMicro1}
  ${focusOutline}
`;

const NewCommentProfile = styled(SmallRoundedImage)`
  margin-left: -${size2};
  margin-right: ${size3};
`;

interface ParentComment {
  authorName: string;
  authorImage: string;
  publishDate: Date | string;
  content: string;
}

export default function PostPage({ id }: Props): ReactElement {
  const { user, showLogin } = useContext(AuthContext);
  const [parentComment, setParentComment] = useState<ParentComment>(null);

  const { data: postById } = useQuery<PostData>(POST_BY_ID_QUERY, {
    variables: { id },
  });

  const { data: comments } = useQuery<PostCommentsData>(POST_COMMENTS_QUERY, {
    variables: { postId: id },
  });

  const [upvotePost] = useMutation<UpvoteData>(UPVOTE_MUTATION, {
    variables: { id },
    optimisticResponse: { upvote: { _: true } },
    update(cache) {
      return updatePostUpvoteCache(cache, id, true);
    },
  });

  const [cancelPostUpvote] = useMutation<CancelUpvoteData>(
    CANCEL_UPVOTE_MUTATION,
    {
      variables: { id },
      optimisticResponse: { cancelUpvote: { _: true } },
      update(cache) {
        return updatePostUpvoteCache(cache, id, false);
      },
    },
  );

  const toggleUpvote = () => {
    if (user) {
      // TODO: add GA tracking
      if (postById?.post.upvoted) {
        return cancelPostUpvote();
      } else if (postById) {
        return upvotePost();
      }
    } else {
      showLogin();
    }
  };

  const sharePost = async () => {
    if ('share' in navigator) {
      try {
        // TODO: add GA tracking
        await navigator.share({
          text: postById.post.title,
          url: postById.post.commentsPermalink,
        });
      } catch (err) {
        // Do nothing
      }
    }
  };

  const openNewComment = () => {
    // TODO: add GA tracking
    if (user) {
      setParentComment({
        authorName: postById.post.source.name,
        authorImage: postById.post.source.image,
        content: postById.post.title,
        publishDate: postById.post.createdAt,
      });
    } else {
      showLogin();
    }
  };

  const onCommentClick = (comment: Comment) => {
    // TODO: add GA tracking
    if (user) {
      setParentComment({
        authorName: comment.author.name,
        authorImage: comment.author.image,
        content: comment.content,
        publishDate: comment.createdAt,
      });
    } else {
      showLogin();
    }
  };

  return (
    <MainLayout>
      <PostContainer>
        {postById && (
          <Head>
            <title>{postById?.post.title}</title>
          </Head>
        )}
        <PostInfo>
          <RoundedImage
            imgSrc={postById?.post.source.image}
            imgAlt={postById?.post.source.name}
            background="var(--theme-background-highlight)"
            ratio="100%"
          />
          <PostInfoSubContainer>
            <SourceName>{postById?.post.source.name}</SourceName>
            <MetadataContainer>
              <Metadata>
                {postById && postDateFormat(postById.post.createdAt)}
              </Metadata>
              {postById?.post.readTime && <MetadataSeparator />}
              {postById?.post.readTime && (
                <Metadata data-testid="readTime">
                  {postById?.post.readTime}m read time
                </Metadata>
              )}
            </MetadataContainer>
          </PostInfoSubContainer>
          <IconButton
            as="a"
            href={postById?.post.permalink}
            title="Go to article"
            target="_blank"
            rel="noopener noreferrer"
          >
            <OpenLinkIcon />
          </IconButton>
        </PostInfo>
        <Title>{postById?.post.title}</Title>
        <Tags>{postById?.post.tags.map((t) => `#${t}`).join(' ')}</Tags>
        <PostImage
          imgSrc={postById?.post.image}
          imgAlt="Post cover image"
          lowsrc={postById?.post.placeholder}
          ratio="49%"
        />
        <ActionButtons>
          <FloatButton
            done={postById?.post.upvoted}
            onClick={toggleUpvote}
            title="Upvote"
          >
            <UpvoteIcon />
            <span>Upvote</span>
          </FloatButton>
          <FloatButton
            done={postById?.post.commented}
            onClick={openNewComment}
            title="Comment"
          >
            <CommentIcon />
            <span>Comment</span>
          </FloatButton>
          <FloatButton onClick={sharePost} title="Share">
            <ShareIcon />
            <span>Share</span>
          </FloatButton>
        </ActionButtons>
        {comments?.postComments.edges.map((e) => (
          <MainComment
            comment={e.node}
            key={e.node.id}
            onComment={onCommentClick}
          />
        ))}
        <NewCommentContainer>
          <NewCommentButton onClick={openNewComment}>
            {user && (
              <NewCommentProfile
                imgSrc={user.image}
                imgAlt="Your profile image"
              />
            )}
            Write your comment...
          </NewCommentButton>
        </NewCommentContainer>
      </PostContainer>
      {parentComment && (
        <NewCommentModal
          isOpen={!!parentComment}
          onRequestClose={() => setParentComment(null)}
          {...parentComment}
          ariaHideApp={!(process?.env?.NODE_ENV === 'test')}
        />
      )}
    </MainLayout>
  );
}
