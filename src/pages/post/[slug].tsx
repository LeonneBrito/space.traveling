import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { GetStaticPaths, GetStaticProps } from 'next';

import { ptBR } from 'date-fns/locale';
import { format, parseISO } from 'date-fns';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';

import { RichText } from 'prismic-dom';
import Prismic from '@prismicio/client';
import { getPrismicClient } from '../../services/prismic';

import Header from '../../components/Header';
import { Comments } from '../../components/Comments';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  preview: boolean;
}

export default function Post({ post, preview }: PostProps): JSX.Element {
  const router = useRouter();

  if (router.isFallback) {
    return <div>Carregando...</div>;
  }

  const readingTime = post.data.content.reduce((acc, content) => {
    const textBody = RichText.asText(content.body);
    const split = textBody.split(' ');
    const numberWords = split.length;

    const result = Math.ceil(numberWords / 200);
    return acc + result;
  }, 0);

  return (
    <>
      <Head>
        <title>{post.data.title} | Space Traveling</title>
      </Head>
      <Header />
      <div className={styles.hero}>
        <img src={post.data.banner.url} alt={post.data.title} />
      </div>
      <main className={commonStyles.container}>
        <article className={styles.post}>
          <h1>{post.data.title}</h1>
          <div className={styles.info}>
            <footer>
              <time>
                <FiCalendar color="#BBBBBB" size={20} />
                {format(parseISO(post.first_publication_date), 'dd MMM yyyy', {
                  locale: ptBR,
                })}
              </time>
              <FiUser color="#BBBBBB" size={20} />
              <span>{post.data.author}</span>
              <FiClock color="#BBBBBB" size={20} />
              <span>{readingTime} min</span>
            </footer>
          </div>
          <main className={styles.content}>
            {post.data.content.map(item => (
              <section key={item.heading}>
                <h2>{item.heading}</h2>
                <article
                  dangerouslySetInnerHTML={{
                    __html: RichText.asHtml(item.body),
                  }}
                />
              </section>
            ))}
          </main>
        </article>
        <div id="comments">
          <Comments />
        </div>
        {preview && (
          <aside className={commonStyles.previewExit}>
            <Link href="/api/exit-preview">
              <a>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.predicates.at('document.type', 'post'),
  ]);

  const paths = posts.results.map(post => ({
    params: { slug: post.uid },
  }));

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params: { slug },
  preview = false,
  previewData,
}) => {
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('post', String(slug), {
    ref: previewData?.ref ?? null,
  });

  const post = {
    first_publication_date: response.first_publication_date,
    uid: response.uid,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content,
    },
  };

  return {
    props: {
      post,
      preview,
    },
    revalidate: 60 * 60 * 24, // 24 Horas
  };
};
