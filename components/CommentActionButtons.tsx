import React, { ReactElement, useContext } from 'react';
import AuthContext from './AuthContext';
import { IconButton } from './Buttons';
import UpvoteIcon from '../icons/upvote.svg';
import CommentIcon from '../icons/comment.svg';
import MenuIcon from '../icons/menu.svg';
import styled from 'styled-components';
import { size10 } from '../styles/sizes';
import {
  CANCEL_COMMENT_UPVOTE_MUTATION,
  CancelCommentUpvoteData,
  Comment,
  updateCommentUpvoteCache,
  UPVOTE_COMMENT_MUTATION,
  UpvoteCommentData,
} from '../graphql/comments';
import { useMutation } from '@apollo/client';

export interface Props {
  comment: Comment;
  onComment: (comment: Comment) => void;
}

const Container = styled.div`
  display: flex;
  align-items: center;
`;

const CommentButton = styled(IconButton)`
  margin-left: ${size10};
`;

const MenuButton = styled(IconButton)`
  margin-left: auto;

  .icon {
    transform: rotate(90deg);
  }
`;

export default function CommentActionButtons({
  comment,
  onComment,
}: Props): ReactElement {
  const { user, showLogin } = useContext(AuthContext);

  const [upvoteComment] = useMutation<UpvoteCommentData>(
    UPVOTE_COMMENT_MUTATION,
    {
      variables: { id: comment.id },
      optimisticResponse: { upvoteComment: { _: true } },
      update(cache) {
        return updateCommentUpvoteCache(cache, comment.id, true);
      },
    },
  );

  const [cancelCommentUpvote] = useMutation<CancelCommentUpvoteData>(
    CANCEL_COMMENT_UPVOTE_MUTATION,
    {
      variables: { id: comment.id },
      optimisticResponse: { cancelCommentUpvote: { _: true } },
      update(cache) {
        return updateCommentUpvoteCache(cache, comment.id, false);
      },
    },
  );

  const toggleUpvote = () => {
    if (user) {
      // TODO: add GA tracking
      if (comment.upvoted) {
        return cancelCommentUpvote();
      } else {
        return upvoteComment();
      }
    } else {
      showLogin();
    }
  };

  return (
    <Container>
      <IconButton
        size="small"
        done={comment.upvoted}
        title="Upvote"
        onClick={toggleUpvote}
      >
        <UpvoteIcon />
      </IconButton>
      <CommentButton
        size="small"
        title="Comment"
        onClick={() => onComment(comment)}
      >
        <CommentIcon />
      </CommentButton>
      {user?.id === comment.author.id && (
        <MenuButton size="small" title="Open menu">
          <MenuIcon />
        </MenuButton>
      )}
    </Container>
  );
}
