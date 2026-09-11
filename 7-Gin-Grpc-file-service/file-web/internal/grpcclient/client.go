package grpcclient

import (
	"context"
	"fmt"

	"local.dev/ginfilepb/gen/filepb"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type Client struct {
	conn *grpc.ClientConn
	File filepb.FileServiceClient
}

func Dial(addr string) (*Client, error) {
	conn, err := grpc.NewClient(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, fmt.Errorf("dial: %w", err)
	}
	return &Client{
		conn: conn,
		File: filepb.NewFileServiceClient(conn),
	}, nil
}

func (c *Client) Close() error {
	if c == nil || c.conn == nil {
		return nil
	}
	return c.conn.Close()
}

func (c *Client) SaveRecord(ctx context.Context, originalName, storedName string, size int64, mimeType, relPath string) (int64, error) {
	resp, err := c.File.SaveFileRecord(ctx, &filepb.SaveFileRecordRequest{
		OriginalName: originalName,
		StoredName:   storedName,
		Size:         size,
		MimeType:     mimeType,
		Path:         relPath,
	})
	if err != nil {
		return 0, err
	}
	return resp.GetId(), nil
}

func (c *Client) List(ctx context.Context) ([]*filepb.FileRecord, error) {
	resp, err := c.File.ListFiles(ctx, &filepb.ListFilesRequest{})
	if err != nil {
		return nil, err
	}
	return resp.GetFiles(), nil
}

func (c *Client) GetByID(ctx context.Context, id int64) (*filepb.FileRecord, error) {
	resp, err := c.File.GetFileById(ctx, &filepb.GetFileByIdRequest{Id: id})
	if err != nil {
		return nil, err
	}
	return resp.GetFile(), nil
}
